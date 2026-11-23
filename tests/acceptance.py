"""Run against two temporary PHP servers and a new private MariaDB schema."""
import csv
import concurrent.futures
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PHP = ["php", "-d", "extension=pdo_mysql", "-d", "display_errors=0"]
class Client:
    def __init__(self, url):
        self.url = url
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.refresh()

    def refresh(self):
        html = self.opener.open(self.url + "/login").read().decode()
        self.token = re.search(r'name="csrf-token" content="([^"]+)', html)[1]

    def api(self, path, data=None, status=200, csrf=True, method=None):
        headers = {"Content-Type": "application/json"}
        if csrf:
            headers["X-CSRF-Token"] = self.token
        request = urllib.request.Request(self.url+"/api/"+path, data=None if data is None else json.dumps(data).encode(), headers=headers, method=method)
        try:
            response = self.opener.open(request)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            self.last_headers = response.headers
            result = json.load(response)
            assert response.status == status, (path, response.status, status, result)
            return result

    def login(self, name):
        self.api("login", {"email":name+"@forma.test", "password":"FormaDemo24!"})
        self.refresh()
        return self

def revenue(client, period="day"):
    return round(sum(row["amount"] for row in client.api("vendor/sales?period="+period)), 2)

def scenarios(urls):
    guest = Client(urls[0])
    catalog = guest.api("catalog")
    assert len(catalog) == 18
    images = [key for product in catalog for key in product["images"]]
    assert len(set(images)) == len(images) == 54
    for product in catalog:
        assert len(product["images"]) == 3 and product["images"][0] == product["image"]
    for key in images:
        with guest.opener.open(urls[0]+"/static/img/"+key+".webp") as response:
            assert response.headers.get_content_type() == "image/webp"
            assert response.read(12)[8:] == b"WEBP"
    print("PASS repeatable 18-product setup and 54 local gallery photos")
    assert guest.opener.open(urls[0]+"/orders").geturl().startswith(urls[0]+"/login")
    guest.api("orders",status=401)
    guest.api("vendor/sales/export",status=401)
    guest.api("notifications",status=401)
    guest.api("account/photo",{},status=401,method="DELETE")
    guest.api("cart",{"id":1,"quantity":1},status=403,csrf=False)
    buyer = guest.login("north")
    buyer.api("vendor/products",status=403)
    buyer.api("vendor/sales/export",status=403)
    vendors = [Client(urls[0]).login("form"),Client(urls[1]).login("field")]
    form,field=vendors
    field.api("orders",status=403)
    field.api("cart",status=403)
    product=form.api("vendor/products")[0]
    field.api("vendor/products",product,status=403)
    form.api("vendor/products",{**product,"price":-1},status=422)
    buyer.api("cart",{"id":1,"quantity":-1},status=422)
    assert len(buyer.api("catalog?category=2&min=4000&max=5000&rating=5"))==1
    print("PASS role access, CSRF, ownership, validation, catalog filters")
    baseline=[[revenue(v),revenue(v,"month")] for v in vendors]
    buyer_unread = buyer.api("notifications")["unread"]
    vendor_unread = [v.api("notifications")["unread"] for v in vendors]
    assert buyer_unread > 0 and all(vendor_unread)
    buyer.api("cart",{"id":1,"quantity":1})
    cart=buyer.api("cart",{"id":2,"quantity":1})
    order=buyer.api("checkout",{"key":cart["key"]})["order_id"]
    assert buyer.api("checkout",{"key":cart["key"]})["order_id"]==order
    assert [v.api("notifications")["unread"] for v in vendors] == [n + 1 for n in vendor_unread]
    groups=[r for r in buyer.api("orders") if r["order_id"]==order]
    assert len(groups)==2 and sum(float(r["unit_price"])*r["quantity"] for r in groups)==13500
    assert not buyer.api("cart")["items"]
    assert buyer.api("catalog")[0]["stock"]==23
    for i,v in enumerate(vendors):
        own=[r for r in v.api("vendor/orders") if r["order_id"]==order]
        assert len(own)==1
        gid=own[0]["group_id"]
        vendors[1-i].api("vendor/orders",{"id":gid,"status":"processing"},status=403)
        v.api("vendor/orders",{"id":gid,"status":"fulfilled"},status=409)
        for status in ["processing","fulfilled"]:
            v.api("vendor/orders",{"id":gid,"status":status})
        assert revenue(v)==baseline[i][0]+float(own[0]["unit_price"])
        assert revenue(v,"month")==baseline[i][1]+float(own[0]["unit_price"])
    assert all(r["status"]=="fulfilled" for r in buyer.api("orders") if r["order_id"]==order)
    assert buyer.api("notifications")["unread"] == buyer_unread + 4
    inbox = buyer.opener.open(urls[0] + "/notifications").read().decode()
    assert "Order in transit" in inbox and "Order completed" in inbox and f"#purchase-{order}" in inbox
    read = {"through": int(re.search(r'data-through="(\d+)"', inbox)[1])}
    remove = {"id": read["through"]}
    buyer.api("notifications", remove, method="DELETE", csrf=False, status=403)
    assert form.api("notifications", remove, method="DELETE") == {"unread": vendor_unread[0] + 1}
    assert buyer.api("notifications") == {"unread": buyer_unread + 4}
    assert buyer.api("notifications", remove, method="DELETE") == {"unread": buyer_unread + 3}
    assert buyer.api("notifications", remove, method="DELETE") == {"unread": buyer_unread + 3}
    inbox = buyer.opener.open(urls[0] + "/notifications").read().decode()
    assert f'data-delete-notification="{remove["id"]}"' not in inbox
    assert sum(row["order_id"] == order for row in buyer.api("orders")) == 2
    print("PASS notification deletion, account ownership, retry, and purchase history")
    buyer.api("notifications",read,status=403,csrf=False)
    assert buyer.api("notifications",read) == {"unread": 0}
    assert buyer.api("notifications") == {"unread": 0}
    assert [v.api("notifications")["unread"] for v in vendors] == [n + 1 for n in vendor_unread]
    form.api("notifications", {"all": True}, method="DELETE", csrf=False, status=403)
    assert form.api("notifications", {"all": True}, method="DELETE") == {"unread": 0}
    assert not re.search(r'data-delete-notification=', form.opener.open(urls[0] + "/notifications").read().decode())
    assert field.api("notifications")["unread"] == vendor_unread[1] + 1
    print("PASS bulk deletion, CSRF, and account isolation")
    print("PASS notification backfill, checkout replay, buyer fulfillment events, access, and persistent read state")
    for vendor in vendors:
        for period in ["day", "month"]:
            with vendor.opener.open(vendor.url+"/api/vendor/sales/export?period="+period) as response:
                assert response.headers.get_content_type()=="text/csv"
                report=list(csv.DictReader(response.read().decode().splitlines()))
            expected=vendor.api("vendor/sales?period="+period)
            assert [(r["period"],float(r["sales_php"])) for r in report]==[(r["date"],r["amount"]) for r in expected]
        vendor.api("vendor/sales/export?period=bad",status=422)
    print("PASS vendor-scoped daily and monthly CSVs match all chart buckets")
    print("PASS multi-vendor purchase, replay, independent fulfillment, buyer history and daily/monthly sales")
    new={**product,"name":"Acceptance sample","stock":1,"price":"17.25"}
    del new["id"]
    sample=form.api("vendor/products",new)["id"]
    rival=Client(urls[1]).login("bay")
    keys=[c.api("cart",{"id":sample,"quantity":1})["key"] for c in [buyer,rival]]
    gate=threading.Barrier(2)
    def compete(pair):
        c,key=pair
        gate.wait()
        try:
            c.api("checkout",{"key":key});return True
        except AssertionError as e:
            assert e.args[0][1]==409,e
            return False
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        outcomes=list(pool.map(compete,zip([buyer,rival],keys)))
    assert sum(outcomes)==1
    loser=[buyer,rival][outcomes.index(False)]
    assert loser.api("cart")["items"][0]["quantity"]==1
    loser.api("cart",{"id":sample,"quantity":0})
    assert next(p for p in form.api("vendor/products") if p["id"]==sample)["stock"]==0
    print("PASS concurrent last-pack checkout on two server processes, retained editable losing cart")
    cart=buyer.api("cart",{"id":1,"quantity":1})
    p=form.api("vendor/products")[0]
    form.api("vendor/products",{**p,"price":"9000.25"})
    form.api("vendor/products",p,status=409)
    buyer.api("checkout",{"key":cart["key"]},status=409)
    updated=buyer.api("cart")
    assert updated["items"][0]["price"]=="9000.25" and updated["key"]!=cart["key"]
    buyer.api("checkout",{"key":updated["key"]})
    assert next(r for r in buyer.api("orders") if r["order_id"]==order and r["title"]==p["name"])["unit_price"]=="8900.00"
    print("PASS price review, inventory version conflicts, immutable purchase prices")

def port():
    with socket.socket() as s:
        s.bind(("127.0.0.1",0));return s.getsockname()[1]

def reorder_scenarios(urls):
    path="orders/1001/reorder"
    guest=Client(urls[0])
    north=Client(urls[0]).login("north")
    bay=Client(urls[1]).login("bay")
    form=Client(urls[0]).login("form")
    field=Client(urls[1]).login("field")
    for client,expected in [(guest,401),(bay,404),(field,403)]:
        client.api(path,status=expected)
        client.api(path,{},status=expected)
    north.api(path,{},status=403,csrf=False)
    def product(vendor,pid):
        return next(p for p in vendor.api("vendor/products") if p["id"]==pid)
    def edit(vendor,pid,**changes):
        vendor.api("vendor/products",{**product(vendor,pid),**changes})
    def selection(review,quantities):
        return {"token":review["token"],"items":[{"line_id":l["line_id"],"quantity":q}
            for l,q in zip(review["lines"],quantities) if q]}

    keyboard=product(form,1); lamp=product(field,2)
    before_history=north.api("orders")
    north.api("cart",{"id":3,"quantity":1})
    north.api("cart",{"id":1,"quantity":1})
    edit(form,1,price="9123.45",pack_size=5,stock=2)
    edit(field,2,stock=0)
    cart_before=north.api("cart")
    review=north.api(path)
    first, second=review["lines"]
    assert (first["suggested"],first["previous_quantity"],first["cart_quantity"])==(1,2,1)
    assert first["cart_price"]==keyboard["price"] and first["cart_pack"]==keyboard["pack_size"]
    assert first["previous_price"]=="8900.00" and first["price"]=="9123.45" and first["previous_pack"]!=first["pack_size"]
    assert second["maximum"]==second["suggested"]==0
    assert north.api("cart")==cart_before
    assert north.api(path,selection(review,[1,1]),status=409)["review"]["lines"][1]["changes"]
    assert north.api("cart")==cart_before
    edit(field,2,stock=5)
    review=north.api(path)
    payload=selection(review,[1,2])
    north.api(path,{"token":review["token"],"items":[{"line_id":999999,"quantity":1}]},status=422)
    edit(field,2,stock=1)
    conflict=north.api(path,payload,status=409)["review"]
    assert conflict["lines"][1]["suggested"]==1 and "stock" in conflict["lines"][1]["changes"]
    assert not conflict["lines"][0]["changes"] and north.api("cart")==cart_before
    # A second tab can change the quantity of an existing line between reviews.
    north.api("cart",{"id":1,"quantity":0})
    stale=north.api(path,selection(conflict,[1,1]),status=409)["review"]
    assert "cart_quantity" in stale["lines"][0]["changes"]
    north.api("cart",{"id":1,"quantity":1})
    edit(form,1,price="9250.00",pack_size=6)
    current=north.api(path,selection(stale,[1,1]),status=409)["review"]
    assert {"price","pack_size"}.issubset(current["lines"][0]["changes"])
    payload=selection(current,[1,0])
    assert north.api(path,payload)=={"added":1}
    after=north.api("cart")
    merged=next(p for p in after["items"] if p["id"]==1)
    assert (merged["quantity"],merged["price"],merged["quoted_pack"])==(2,"9250.00",6)
    assert next(p for p in after["items"] if p["id"]==3)==next(p for p in cart_before["items"] if p["id"]==3)
    assert not any(p["id"]==2 for p in after["items"])
    assert north.api(path,payload)=={"added":1} and north.api("cart")==after
    assert north.api("orders")==before_history and product(form,1)["stock"]==2
    for vendor,p in [(form,keyboard),(field,lamp)]:
        edit(vendor,p["id"],price=p["price"],stock=p["stock"],pack_size=p["pack_size"])
    print("PASS Buy Again ownership, CSRF, caps, sold-out items, live conflicts, atomic merge, new quotes, skips and safe replay")

def rating_scenarios(url):
    buyer = Client(url).login("north")
    other = Client(url).login("bay")
    vendor = Client(url).login("form")
    rows = buyer.api("orders")
    line = next(row for row in rows if row["order_id"] == 1001 and row["product_id"] == 1)
    pending = next(row for row in rows if row["status"] != "fulfilled")
    rating = {"line_id": line["line_id"], "stars": 3}
    other.api("orders/rating", rating, status=404)
    vendor.api("orders/rating", rating, status=403)
    buyer.api("orders/rating", rating, csrf=False, status=403)
    buyer.api("orders/rating", {**rating, "stars": 6}, status=422)
    buyer.api("orders/rating", {**rating, "line_id": pending["line_id"]}, status=409)
    assert buyer.api("orders/rating", rating) == {"stars": 3}
    assert buyer.api("orders/rating", {**rating, "stars": 1}) == {"stars": 1}
    product = next(row for row in buyer.api("catalog") if row["id"] == 1)
    assert float(product["rating"]) == 3
    assert all(row["stars"] == 1 for row in buyer.api("orders") if row["product_id"] == 1)
    print("PASS buyer ratings, fulfillment and ownership checks, updates and catalog average")

def deletion_scenarios(url):
    buyer = Client(url).login("north")
    vendor = Client(url).login("form")
    other = Client(url).login("field")
    product = next(p for p in vendor.api("vendor/products") if p["id"] == 1)
    request = {"id": product["id"], "version": product["version"]}
    history = buyer.api("orders")
    cart = buyer.api("cart", {"id": product["id"], "quantity": 1})
    other.api("vendor/products", request, status=403, method="DELETE")
    vendor.api("vendor/products", request, status=403, csrf=False, method="DELETE")
    vendor.api("vendor/products", {**request, "version": request["version"] - 1}, status=409, method="DELETE")
    assert vendor.api("vendor/products", request, method="DELETE")["ok"]
    assert not any(p["id"] == product["id"] for p in buyer.api("catalog"))
    assert not any(p["id"] == product["id"] for p in vendor.api("vendor/products"))
    buyer.api("checkout", {"key": cart["key"]}, status=409)
    assert not buyer.api("cart")["items"]
    assert buyer.api("orders") == history
    review = buyer.api("orders/1001/reorder")
    assert next(line for line in review["lines"] if line["product_id"] == product["id"])["maximum"] == 0
    print("PASS vendor deletion ownership, CSRF, edit versions, cart cleanup and historical purchases")

def account_scenarios(url):
    guest = Client(url)
    assert "/login?next=%2Fprofile" in guest.opener.open(url + "/profile").geturl()
    assert "/login?next=%2Fsettings" in guest.opener.open(url + "/settings").geturl()
    guest.api("account/profile", {"name": "New name"}, status=401)
    guest.api("account/password", {}, status=401)

    buyer = Client(url).login("north")
    vendor = Client(url).login("form")
    buyer.api("account/profile", {"name": "New name"}, status=403, csrf=False)
    buyer.api("account/profile", {"name": " "}, status=422)
    buyer.api("account/profile", {"name": "A" * 101}, status=422)
    assert buyer.api("account/profile", {"name": "  North Retail QA  "}) == {"name": "North Retail QA"}
    assert 'value="North Retail QA"' in buyer.opener.open(url + "/profile").read().decode()
    assert 'value="Form Studio"' in vendor.opener.open(url + "/profile").read().decode()
    assert 'value="North Retail QA"' in Client(url).login("north").opener.open(url + "/profile").read().decode()
    assert vendor.api("account/profile", {"name": "Form Studio QA"}) == {"name": "Form Studio QA"}

    old_password = "FormaDemo24!"
    new_password = "FormaAccountTest-428!"
    change = {"current_password": old_password, "new_password": new_password, "confirm_password": new_password}
    vendor.api("account/password", change, status=403, csrf=False)
    vendor.api("account/password", {**change, "new_password": "short"}, status=422)
    vendor.api("account/password", {**change, "confirm_password": "different"}, status=422)
    vendor.api("account/password", {**change, "current_password": "incorrect"}, status=422)
    assert vendor.api("account/password", change) == {"ok": True}
    assert vendor.opener.open(url + "/settings").geturl() == url + "/settings"
    guest.api("login", {"email": "form@forma.test", "password": old_password}, status=401)
    result = guest.api("login", {"email": "form@forma.test", "password": new_password})
    assert result["name"] == "Form Studio QA" and result["role"] == "vendor"
    print("PASS buyer/vendor profile persistence, guest access, CSRF, password validation and sign-in")
    outsider = Client(url)
    outsider.api("account/recovery", {"current_password": old_password}, status=401)
    buyer.api("account/recovery", {"current_password": "incorrect"}, status=422)
    code = buyer.api("account/recovery", {"current_password": old_password})["code"]
    reset = {"email": "north@forma.test", "code": code, "new_password": new_password,
             "confirm_password": new_password}
    outsider.api("reset-password", reset, csrf=False, status=403)
    outsider.api("reset-password", {**reset, "email": "bay@forma.test"}, status=422)
    assert outsider.api("reset-password", reset) == {"ok": True}
    outsider.api("reset-password", reset, status=422)
    outsider.api("login", {"email": reset["email"], "password": old_password}, status=401)
    assert outsider.api("login", {"email": reset["email"], "password": new_password})["role"] == "buyer"
    print("PASS one-time recovery, password verification, account ownership and re-login")


def registration_scenarios(url):
    password = "NewAccountDemo123!"
    request = {"name": "New account", "email": "new-buyer@example.test",
               "new_password": password, "confirm_password": password}
    buyer = Client(url)
    buyer.api("register", request, csrf=False, status=403)
    buyer.api("register", {**request, "role": "admin"}, status=422)
    result = buyer.api("register", request, status=201)
    assert result["role"] == "buyer"
    assert buyer.api("orders") == []
    buyer.api("vendor/products", status=403)

    vendor = Client(url)
    details = {**request, "name": "New Supplier", "email": "new-vendor@example.test", "role": "vendor"}
    result = vendor.api("register", details, status=201)
    assert result["role"] == "vendor"
    assert vendor.api("vendor/products") == [] and vendor.api("vendor/orders") == []
    vendor.api("orders", status=403)
    guest = Client(url)
    guest.api("register", details, status=409)
    assert guest.api("login", {"email": details["email"], "password": password})["role"] == "vendor"
    print("PASS buyer and vendor registration, role validation, duplicate email and workspace access")


def security_scenarios(urls, env):
    first, second = (Client(url) for url in urls)
    assert first.api("login", {"email": "field@forma.test", "password": "FormaDemo24!"})["role"] == "vendor"
    first.refresh()
    products = first.api("vendor/products")
    product = products[0]
    first.api("vendor/products", {**product, "stock": product["stock"] + 1})
    inventory_id = first.last_headers["X-Request-ID"]

    wrong = {"email": "field@forma.test", "password": "InvalidSecretTest-529!"}
    for _ in range(9):
        try:
            second.api("login", wrong, status=401)
        except AssertionError as failure:
            assert failure.args[0][1] == 429
            break
    else:
        raise AssertionError("Repeated sign-in attempts did not trigger HTTP 429")
    first.api("login", wrong, status=429)
    blocked_id = first.last_headers["X-Request-ID"]
    assert 1 <= int(first.last_headers["Retry-After"]) <= 600
    assert first.api("catalog")
    result = subprocess.run([*PHP, "backend/audit.php"], env=env, cwd=ROOT,
                            check=True, capture_output=True, text=True)
    assert wrong["password"] not in result.stdout and wrong["email"] not in result.stdout
    events = {event["request_id"]: event for event in map(json.loads, result.stdout.splitlines())}
    inventory = events[inventory_id]
    assert inventory["action"] == "vendor.inventory_save" and inventory["http_status"] == 200
    assert inventory["user_id"] is not None and inventory["ip_address"] == "127.0.0.1"
    blocked = events[blocked_id]
    assert blocked["action"] == "account.sign_in" and blocked["http_status"] == 429
    assert blocked["created_at"]
    print("PASS shared authentication rate limit, Retry-After and credential-free audit log")


def main():
    if "--browser" in sys.argv:
        check = ["-r", "exit(function_exists('imagewebp') ? 0 : 1);"]
        if subprocess.run([*PHP, *check], cwd=ROOT).returncode:
            PHP.extend(["-d", "extension=gd"])
            subprocess.run([*PHP, *check], cwd=ROOT, check=True)
    name="forma_qa_"+secrets.token_hex(6)
    def run(*args,env=None):
        subprocess.run([*PHP,*args],cwd=ROOT,env=env,check=True)
    run("tests/database.php","create",name)
    servers=[]
    try:
        with tempfile.TemporaryDirectory(dir=ROOT/".runtime") as folder:
            config=Path(folder)/"test.env"
            config.write_text(re.sub(r"(?m)^DB_NAME=.*$", "DB_NAME="+name, (ROOT/".env").read_text(), count=1))
            env={**os.environ,"FORMA_ENV_FILE":str(config)}
            run("backend/setup.php",env=env)
            run("backend/setup.php",env=env)
            urls=[]
            for _ in range(2):
                address="127.0.0.1:"+str(port());url="http://"+address
                server=subprocess.Popen([*PHP,"-S",address,"-t","backend","backend/index.php"],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                servers.append(server)
                for attempt in range(50):
                    try:
                        with urllib.request.urlopen(url+"/api/catalog",timeout=2) as response: assert response.status==200
                        break
                    except OSError: time.sleep(.1)
                urls.append(url)
            scenarios(urls)
            reorder_scenarios(urls)
            if "--browser" in sys.argv:
                subprocess.run(["node","tests/browser.cjs",urls[0]],cwd=ROOT,env={**env,"TMP":folder,"TEMP":folder,"TMPDIR":folder},check=True)
            rating_scenarios(urls[0])
            deletion_scenarios(urls[0])
            account_scenarios(urls[0])
            registration_scenarios(urls[0])
            security_scenarios(urls, env)
    finally:
        for server in servers:
            server.terminate();server.wait(timeout=10)
        run("tests/database.php","remove",name)
if __name__=="__main__":
    main()

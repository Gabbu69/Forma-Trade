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

    def api(self, path, data=None, status=200, csrf=True):
        headers = {"Content-Type": "application/json"}
        if csrf:
            headers["X-CSRF-Token"] = self.token
        request = urllib.request.Request(self.url+"/api/"+path, data=None if data is None else json.dumps(data).encode(), headers=headers)
        try:
            response = self.opener.open(request)
        except urllib.error.HTTPError as error:
            response = error
        with response:
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
    assert guest.opener.open(urls[0]+"/orders").geturl().startswith(urls[0]+"/login")
    guest.api("orders",status=401)
    guest.api("vendor/sales/export",status=401)
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
    buyer.api("cart",{"id":1,"quantity":1})
    cart=buyer.api("cart",{"id":2,"quantity":1})
    order=buyer.api("checkout",{"key":cart["key"]})["order_id"]
    assert buyer.api("checkout",{"key":cart["key"]})["order_id"]==order
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

def main():
    name="forma_qa_"+secrets.token_hex(6)
    def run(*args,env=None):
        subprocess.run([*PHP,*args],cwd=ROOT,env=env,check=True)
    run("tests/database.php","create",name)
    servers=[]
    try:
        with tempfile.TemporaryDirectory(dir=ROOT/".runtime") as folder:
            config=Path(folder)/"test.env"
            config.write_text((ROOT/".env").read_text().replace("DB_NAME=forma_supply","DB_NAME="+name))
            env={**os.environ,"FORMA_ENV_FILE":str(config)}
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
    finally:
        for server in servers:
            server.terminate();server.wait(timeout=10)
        run("tests/database.php","remove",name)
if __name__=="__main__":
    main()

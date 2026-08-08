const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const os=require("os");
const PORT=process.env.PORT||3000;
const uploads=new Map(), clients=new Set();
const mime={".html":"text/html;charset=utf-8",".js":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml"};

function broadcast(obj){const s="data: "+JSON.stringify(obj)+"\n\n";for(const r of clients){r.write(s)}}
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,"http://localhost");
  if(u.pathname==="/events"){
    res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive","Access-Control-Allow-Origin":"*"});
    res.write(": connected\n\n"); clients.add(res); req.on("close",()=>clients.delete(res)); return;
  }
  if(u.pathname==="/upload" && req.method==="POST"){
    let body=[]; let size=0;
    req.on("data",c=>{size+=c.length;if(size<10*1024*1024)body.push(c)});
    req.on("end",()=>{
      try{
        const d=JSON.parse(Buffer.concat(body).toString());
        if(!d.data || !d.type) throw Error("bad");
        const id=crypto.randomUUID(), item={id,data:d.data,type:d.type,name:d.name||"photo"};
        uploads.set(id,item); broadcast({type:"mission",...item});
        res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({ok:true,id}));
      }catch(e){res.writeHead(400);res.end(JSON.stringify({ok:false}))}
    });return;
  }
  if(u.pathname==="/qr-url"){res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({url:`http://${getIP()}:${PORT}/upload.html`}));return}
  if(u.pathname==="/"){serve("/index.html",res);return}
  serve(u.pathname,res);
});
function serve(p,res){const f=path.join(__dirname,"public",path.normalize(p).replace(/^(\.\.[\/\\])+/,''));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end("Not found")}else{res.writeHead(200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream"});res.end(d)}})}
function getIP(){const n=os.networkInterfaces();for(const k of Object.keys(n))for(const x of n[k])if(x.family==="IPv4"&&!x.internal)return x.address;return "localhost"}
server.listen(PORT,()=>console.log(`Space Photo Mission: http://${getIP()}:${PORT}`));

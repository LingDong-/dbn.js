/*global describe DBN*/
if (![].at) {
  Array.prototype.at = function(pos) { return this.slice((pos+this.length)%this.length, (pos+this.length)%this.length+1)[0] }
}


let EXAMPLES = `
book/room.dbn             gallery/graymachine.dbn   gallery/nervousguy.dbn    gallery/rockettime.dbn  learn/gradres.dbn   learn/paper.dbn      learn/time2.dbn
gallery/amoebic.dbn       gallery/headsortails.dbn  gallery/paramecium.dbn    gallery/thehunt.dbn     learn/line.dbn      learn/pinwheel.dbn   learn/trail.dbn
gallery/bandedclock.dbn   gallery/intersecting.dbn  gallery/plaid.dbn         gallery/tuftball.dbn    learn/looping.dbn   learn/questions.dbn  learn/variable.dbn
gallery/dancinguy.dbn     gallery/meeber.dbn        gallery/probing.dbn       learn/calculate.dbn     learn/nesting1.dbn  learn/reactive.dbn   book/paper-plane.dbn
gallery/dancingy.dbn      gallery/merging.dbn       gallery/quantitative.dbn  learn/commands.dbn      learn/nesting2.dbn  learn/repeating.dbn
gallery/grainsofrain.dbn  gallery/missshow.dbn      gallery/raininglines.dbn  learn/dots.dbn          learn/painting.dbn  learn/time1.dbn
`.split(/\n| /g).filter(x=>x.length).sort();

let cnv = document.getElementById('cnv');
let ctx = cnv.getContext('2d');
let cnv_pad = 40;

let cn2 = document.createElement('canvas');
let ct2 = cn2.getContext('2d');
// cnv.parentElement.appendChild(cn2);

let src = document.getElementById("src");
let dst = document.getElementById("dst");

let cn3 = document.createElement('canvas');
let ct3 = cn3.getContext('2d');


function setcnv(){
  let {W,H,pixsize} = DBN.state;
  let ps = pixsize;
  let rl = cnv_pad;
  cnv.width = W*ps+rl*2;
  cnv.height = H*ps+rl*2;
  
  ctx.fillStyle="white";
  ctx.fillRect(rl,rl,W*ps,H*ps);
  ctx.strokeStyle="black";
  ctx.strokeRect(rl-0.5,rl-0.5,W*ps+1,H*ps+1);
  let step = 20;
  if (DBN.state.W > 100){
    step = 25;
  }
  ctx.font = "10px sans-serif"
  ctx.fillStyle="white";
  ctx.strokeStyle="white";
  for (let i = 0; i <= W; i+= step){
    ctx.beginPath();
    ctx.moveTo(rl+i*ps,rl+H*ps);
    ctx.lineTo(rl+i*ps,rl+H*ps+5);
    ctx.stroke();
    ctx.fillText(i,rl+i*ps,rl+H*ps+13);
  }
  ctx.textAlign="right";
  for (let i = 0; i <= H; i+= step){
    ctx.beginPath();
    ctx.moveTo(rl-5,rl+H*ps-i*ps);
    ctx.lineTo(rl,rl+H*ps-i*ps);
    ctx.stroke();
    ctx.fillText(i,rl-6,rl+H*ps-i*ps);
  }
  
}

setcnv();

function render(){

  ctx.imageSmoothingEnabled = false;
  ct2.imageSmoothingEnabled = false;

  let {W,H,pixsize,canvas} = DBN.state;
  cn2.width = W;
  cn2.height = H;
  // let imd = ct2.getImageData(0,0,W,H);
  let imd = new ImageData(W,H);
  for (let i = 0; i < H; i++){
    for (let j = 0; j < W; j++){
      let v = 255-canvas[i*W+j]/100*255;
      imd.data[((H-i-1)*W+j)*4+0] = v;
      imd.data[((H-i-1)*W+j)*4+1] = v;
      imd.data[((H-i-1)*W+j)*4+2] = v;
      imd.data[((H-i-1)*W+j)*4+3] = 255;
    }
  }
  ct2.putImageData(imd,0,0);
  ctx.drawImage(cn2,cnv_pad,cnv_pad,W*pixsize,H*pixsize);
  
}

function render_giant(){

  
  
  // ct2.imageSmoothingEnabled = false;
  
  let {W,H,pixsize,canvas} = DBN.state;
  
  let sx = ~~(window.innerWidth/W);
  let sy = ~~(window.innerHeight/H);
  let scl = Math.min(sx,sy);
    
  cn3.width = W*scl;
  cn3.height = H*scl;
  ct3.fillStyle="white";
  ct3.fillRect(0,0,cn3.width,cn3.height);
  
  ct3.imageSmoothingEnabled = false;
  ct3.drawImage(cn2,0,0,W*scl,H*scl);
  // ct3.drawImage(cn2,0,0);
  
}


function hline(lino){
  try{
    document.getElementById(`hline-${lino}`).style.background="rgba(0,0,0,0.2)";
  }catch(e){}
}

function dbn_try(f){
  try{
    return f();
  }catch(e){
    if (e.match){
      let o = e.match(/at line (.*?) /g);
      if (o){
        for (let i = 0; i < o.length; i++){
          let lino = Number(o[i].slice(8))-1;
          console.log(lino);
          hline(lino)
          // setTimeout(function(){
          //   Array.from(document.getElementsByClassName('hline')).map(x=>x.style.background='none');
          // },500)
        }
      }
    }
    document.getElementById('msg').innerHTML = 'Problem: '+e;
    throw e;
  }
}

const MODE_IDLE = 0;
const MODE_PLAY = 1;
const MODE_STEP = 2;

let mode = 0;

function init_exe(){
  setcnv();
  let txt = src.value;
  DBN.rset();
  let toks = dbn_try(_=>DBN.tokenize(txt));
  console.log(toks);
  let tree = dbn_try(_=>DBN.parse(toks));
  console.log(tree);
  dbn_try(_=>DBN.compile(tree));
  console.log(DBN.state.instrs);
  document.getElementById('msg').innerHTML = "";
  
  for (let k in keysheld){
    delete keysheld[k];
  }
}

function make_tooltip(eid,tip){
  let oldmsg = "";
  document.getElementById(eid).onmouseenter = function(){
    oldmsg = document.getElementById('msg').innerHTML;
    document.getElementById('msg').innerHTML = tip;
  }
  document.getElementById(eid).onmouseleave = function(){
    if (document.getElementById('msg').innerHTML == tip){
      document.getElementById('msg').innerHTML = oldmsg;
    }
  }
}
make_tooltip('btn-play','Play');
make_tooltip('btn-stop','Stop');
make_tooltip('btn-step','Pause / Step');
make_tooltip('btn-open','Load Example / Upload Program');
make_tooltip('btn-save','Download Program');
make_tooltip('btn-print','Export GIF');
make_tooltip('btn-format','Beautify');
make_tooltip('btn-setting','Settings')
make_tooltip('btn-info','Help / Info')

document.getElementById("btn-play").onclick = function(){
  if (mode == MODE_IDLE){
    init_exe();
  }
  mode = MODE_PLAY;
  document.getElementById('under-cnv').innerHTML = "";
}
document.getElementById("btn-stop").onclick = function(){
  mode = MODE_IDLE;
  DBN.rset();
  Array.from(document.getElementsByClassName('hline')).map(x=>x.style.background='none');
  document.getElementById('under-cnv').innerHTML = "";
}

document.getElementById("btn-step").onclick = function(){
  if (mode == MODE_IDLE){
    init_exe();
  }
  mode = MODE_STEP;
  if (DBN.state.pctr<DBN.state.instrs.length){
    Array.from(document.getElementsByClassName('hline')).map(x=>x.style.background='none');
    let pos = DBN.state.instrs[DBN.state.pctr].tok.pos;
    try{
      dbn_try(_=>DBN.execute_step());
    }catch(e){
      DBN.state.pctr = DBN.state.instrs.length;
      throw e;
    }
    hline(pos[0])
    render();
    inspect_vars();
  }else{
    if (document.getElementById('msg').innerHTML==""){
      Array.from(document.getElementsByClassName('hline')).map(x=>x.style.background='none');
      document.getElementById('msg').innerHTML = "Done.";
    }
    mode = MODE_IDLE;
    document.getElementById('under-cnv').innerHTML = "";
  }
}

document.getElementById("btn-open").onclick = function(){
  modal_select(EXAMPLES);
}

document.getElementById("btn-save").onclick = function(){
  download_file("sketch.dbn",src.value);
}

document.getElementById("btn-print").onclick = function(){
  document.getElementById("btn-stop").click();
  
  let opt = {
    frame_delay:5,
    every_x_frame:5,
    start_frame:0,
    num_frames:500,
  };
  modal_fields(opt,`
  <div style="font-size:14px">
  Export Animated GIF
  </div>
  <div style="font-size:11px;">
  Configure and click OK to start exporting
  </div>
  `,_=>render_gif(opt));
  
  
}

function download_bin(pth,bytes){
  let name = pth;
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  var blob = new Blob([new Uint8Array(bytes)], {type: "image/gif"});
  var url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  window.URL.revokeObjectURL(url);
}

function render_gif(opt){
  console.log(opt);
  let frames = [];
  let cnt = 0;
  init_exe();
  let prog = document.createElement('progress');
  prog.max=100;
  document.getElementById('msg').appendChild(prog);
  function rstep(){
    console.log('rendering gif frame',cnt,'pc',DBN.state.pctr);
    if (DBN.state.pctr<DBN.state.instrs.length){
      prog.value = ~~(100*cnt/(opt.start_frame+opt.num_frames));
      try{
        DBN.execute();
        if (cnt >= opt.start_frame){
          if (cnt % opt.every_x_frame == 0){
            let o = [];
            for (let i = 0; i < DBN.state.H; i++){
              for (let j = 0; j < DBN.state.W; j++){
                // o.push(~~(Math.random()*255));
                let v = ~~(255-DBN.state.canvas[(DBN.state.H-i-1)*DBN.state.W+j]*2.55);
                o.push(Math.min(Math.max(v,0),255));
              }
            }
            // console.log(o[0])
            frames.push(o);
          }
         
        }
        if (cnt >= opt.start_frame+opt.num_frames){
          DBN.state.pctr = DBN.state.instrs.length;
        }
      }catch(e){
        console.log("user code error, stopping")
        DBN.state.pctr = DBN.state.instrs.length;
      }
      cnt++;
      setTimeout(rstep,1);
    }else{
      console.log(frames);
      document.getElementById("btn-stop").click();
      let bytes = encode_anim_gif(frames,DBN.state.W,DBN.state.H,opt.delay);
      document.getElementById('msg').innerHTML = "";
      download_bin("animation.gif",bytes);
      
    }
  }
  rstep();
}


document.getElementById("btn-format").onclick = function(){
  src.value = beautify(src.value);
  highlight();
}

document.getElementById("btn-setting").onclick = function(){
  modal_fields(DBN.options,`<div style="font-size:14px">
  Options
  </div>
  <div style="font-size:11px;">
  For an explanation of what each option does, see <a href="help.txt">Help</a>.
  </div>`);
}

document.getElementById("btn-info").onclick = function(){
  window.open("help.txt");
}

let is_fullscr = false;
let prv_bg = "0,0,0,0.9";

document.getElementById("btn-fullscr").onclick = function(){
  is_fullscr = true;
  let bg = document.createElement("div");
  bg.style=`display: flex;position:fixed;top:0px;left:0px;width:100%;height:100%;background:rgba(${prv_bg})`
  bg.id = 'bg';
  let div = document.createElement("div");
  div.style="margin:auto auto;";
  bg.appendChild(div);
  div.onclick = function(e){
    e.stopPropagation();
  }
  
  // cn3.style="display:block;margin:auto auto;"
  div.appendChild(cn3);
  
  let btnx = document.createElement("button");
  btnx.innerHTML = "×"
  btnx.style="position:absolute;top:0px;right:0px;color:white;background:none;border:none;outline:none;font-size:32px;cursor:pointer";
  bg.appendChild(btnx);
  btnx.onclick = function(e){
    document.body.removeChild(bg);
    is_fullscr = false;
    e.stopPropagation();
  }
  
  bg.onclick = function(){
    document.body.removeChild(bg);
    is_fullscr = false;
  }
  render_giant();
  document.body.appendChild(bg);
}


function play(){
  // requestAnimationFrame(play);
  // setTimeout(play,200)
  if (DBN.state.frametime == 0){
    requestAnimationFrame(play);
  }else{
    setTimeout(play,DBN.state.frametime*10);
  }
  
  if (mode == MODE_PLAY){
    if (DBN.state.pctr<DBN.state.instrs.length){

      Array.from(document.getElementsByClassName('hline')).map(x=>x.style.background='none');
      let pos = DBN.state.instrs[DBN.state.pctr].tok.pos;
      try{
        dbn_try(_=>DBN.execute());
      }catch(e){
        DBN.state.pctr = DBN.state.instrs.length;
        throw e;
      }
      hline(pos[0])
      render();
      if (is_fullscr) render_giant();
      // inspect_vars();
    }else{
      if (document.getElementById('msg').innerHTML==""){
        Array.from(document.getElementsByClassName('hline')).map(x=>x.style.background='none');
        document.getElementById('msg').innerHTML = "Done.";
      }
      mode = MODE_IDLE;
      document.getElementById('under-cnv').innerHTML = "";
    }
  }
}

play();






let colors = {
  "color:#406595;":DBN.keywords.map(x=>x[0]).concat('command','number'),
}
let keywords = [];
for (let k in colors){
  colors[k].map(x=>keywords.push([x,k]));
}
keywords.sort((a,b)=>(b[0].length-a[0].length));
keywords = Object.fromEntries(keywords);

let keysheld = {};

if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)){ 
  // stupid safari

}else{
  console.log("thank you for using a good browser.")
  src.style.whiteSpace="nowrap";
  dst.style.whiteSpace="pre";
}


function highlight(){
  var cc = src.value;
  cc = cc.replace(/\r\n/g,'\n').replace(/\r/,'\n').replace(/</g,'&lt;');
  let lino = 0;
  let guts = `display:inline-block;width:23px;padding-right:12px;text-align:right;color:#BBBBBB;letter-spacing:-1;`;
  var nc = `<span class="hline" id="hline-${lino++}"><span style="${guts}">${lino}</span>`;
  let abc123 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890_"
  for (var j = 0; j < cc.length; j++){
    var matched = false;
    if (!abc123.includes(cc[j-1])){
      for (var k in keywords){
        matched = true;
        var buf = "";
        for (var l = 0; l < k.length; l++){
          buf += cc[j+l];
          if ((cc[j+l]??"").toLowerCase() != k[l]){
            matched = false;
            break;
          }
        }
        if (abc123.includes(cc[j+k.length])){
          matched = false;
        }
        if (matched){ 
          nc += `<span style="${keywords[k]}">`+buf+"</span>";
          j += k.length-1;
          break;
        }
      }
    }
    if (cc[j] == '/' && cc[j+1] == '/'){
      let buf = cc[j++];
      while (j < cc.length && cc[j] != '\n'){
        buf += cc[j++];
      }
      if (cc[j]) buf += cc[j];
      nc += `<span style="color:gray">${buf}</span>`
      matched = 1;
    }
    if (cc[j] == '\n'){
      nc += "</span>"
    }
    if (!matched){
      nc += cc[j];
    }
    if (cc[j] == '\n' && cc[j+1] !== undefined){
      nc += `<span class="hline" id="hline-${lino++}"><span style="${guts}">${lino}</span>`
    }
  }
  dst.innerHTML = nc+"</span>\n"; 
}
src.onscroll = function(){
  dst.scrollLeft = src.scrollLeft;   
  dst.scrollTop = src.scrollTop;  
}
src.oninput = function(){
  highlight();
}
highlight();


function calc_mouse(event){
  let box = cnv.getBoundingClientRect();
  mouseX = event.clientX-box.left;
  mouseY = event.clientY-box.top;
  mouseX = (mouseX - cnv_pad)/DBN.state.pixsize+1;
  mouseY = DBN.state.H-(mouseY - cnv_pad)/DBN.state.pixsize+1;
}

let mouseX, mouseY, mouseIsDown;

cnv.addEventListener('mousedown',function(event){
  calc_mouse(event);
  mouseIsDown = true;
  event.stopPropagation();
});
cnv.addEventListener('mousemove',function(event){
  calc_mouse(event);
});
cnv.addEventListener('mouseup',function(event){
  mouseIsDown = false;
});
cnv.addEventListener('mouseleave',function(event){
  mouseIsDown = false;
});


function calc_mouse_fullscr(event){
  let box = cn3.getBoundingClientRect();
  mouseX = (event.clientX-box.left)/cn3.width*DBN.state.W+1;
  mouseY = DBN.state.H-(event.clientY-box.top)/cn3.height*DBN.state.H+1;
}

cn3.addEventListener('mousedown',function(event){
  calc_mouse_fullscr(event);
  mouseIsDown = true;
  event.stopPropagation();
});
cn3.addEventListener('mousemove',function(event){
  calc_mouse_fullscr(event);
});
cn3.addEventListener('mouseup',function(event){
  mouseIsDown = false;
});
cn3.addEventListener('mouseleave',function(event){
  mouseIsDown = false;
});


DBN.hooks.getmouse = function(n){
  if (n == 1){
    return ~~mouseX;
  }else if (n == 2){
    return ~~mouseY;
  }else{
    return Number(mouseIsDown)*100;
  }
}
DBN.hooks.setsize = function(){
  setcnv();
}
DBN.hooks.getkey = function(n){
  // console.log(n,Number(keysheld[n]??0)*100,keysheld);
  return Number(keysheld[n]??0)*100;
}

function smartbg(){
  DBN.hooks.background = function(g){
    let c = 200-g*2;
    prv_bg = `${c},${c},${c},1.0`
    let bg = document.getElementById('bg');
    if (bg){
      bg.style.background = `rgba(${prv_bg},0.9)`;
    }
  }
}

function calc_key(event){
  let key = event.key.toLowerCase();
  if (key.length != 1) return null;
    
  let n = key.charCodeAt(0)-97
  if (n >= 26) return null;
  return n+1;
  
}
document.addEventListener('keydown',function(event){
  // console.log('v',event.key)
  let n = calc_key(event);
  if (n !== null){
    keysheld[n] = true;
  }
});

document.addEventListener('keyup',function(event){
  // console.log('^',event.key)
  let n = calc_key(event);
  if (n !== null){
    keysheld[n] = false;
  }
});

function read_file(path){
  let xhr = new XMLHttpRequest();
  xhr.open("GET", path,false);
  xhr.send();
  return xhr.responseText;
}

function download_file(pth,text){
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', pth);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

DBN.hooks.readfile = function(pth){
  return read_file(pth);
}



function modal_select(options){
  let sel = 0;
  let bg = document.createElement("div");
  bg.style="display: flex;position:fixed;top:0px;left:0px;width:100%;height:100%;background:rgba(0,0,0,0.5)"
  let div = document.createElement("div");
  div.style="margin:auto auto;width:300px;height:300px;background:#CCCCCC;border:0px solid black;padding:10px;";
  bg.appendChild(div);
  bg.onclick = function(){
    document.body.removeChild(bg);
  }
  div.onclick = function(e){
    e.stopPropagation();
  }
  div.innerHTML = `<div style="font-size:14px">
  Open
  </div>`;
  let selcont = document.createElement('div');
  selcont.style = `height:230px;overflow:scroll;border:0px solid black;background:white;margin-top:10px;margin-bottom:10px`
  div.appendChild(selcont);
  
  for (let i = 0; i < EXAMPLES.length; i++){
    let opt = document.createElement('div');
    opt.classList.add('selopt','unselectable');
    opt.style = `font-family:monospace;cursor:default;border-bottom: 1px dotted black;padding:1px 5px;font-size:12px;${(i==sel)?'background:#7198C8;':''}`;
    let idx = EXAMPLES[i].indexOf('/');
    if (idx != -1){
      opt.innerHTML = `<span style="color:rgba(0,0,0,0.5);">${EXAMPLES[i].slice(0,idx)}/</span>${EXAMPLES[i].slice(idx+1)}`;
    }else{
      opt.innerHTML = EXAMPLES[i];
    }
    opt.onclick = function(){
      sel = i;
      Array.from(document.getElementsByClassName('selopt')).forEach(x=>{
        x.style.removeProperty('background');
      })
      opt.style.background='#7198C8';
    }
    selcont.appendChild(opt);
  }
  let btnu = document.createElement("button");
  btnu.innerHTML = "Upload..."
  btnu.style="margin-right:10px"
  div.appendChild(btnu);
  
  btnu.onclick = function(){
    var inp = document.createElement("input");
    inp.type = "file";
    inp.addEventListener('change', function(e){
      var reader = new FileReader();
      reader.onload = function(){
        let buf = reader.result;
        src.value = buf;
        highlight();
        DBN.rset();
        render();
        document.body.removeChild(bg);
        document.body.removeChild(inp);
      }
      reader.readAsText(e.target.files[0]);     
    }, false);
    inp.click();
    document.body.appendChild(inp);
    mode = MODE_IDLE
    DBN.rset();
  }
  
  
  let btnn = document.createElement("button");
  btnn.innerHTML = "Cancel"
  div.appendChild(btnn);
  btnn.onclick = function(){
    document.body.removeChild(bg);
  }

  let btny = document.createElement("button");
  btny.style=`float:right;`
  btny.innerHTML = "OK"
  div.appendChild(btny);
  
  btny.onclick = function(){
    src.value = read_file("examples/"+EXAMPLES[sel]);
    console.log(src.value);
    highlight();
    document.body.removeChild(bg);
    mode = MODE_IDLE;
    DBN.rset();
    render();
  }

  
  document.body.appendChild(bg);
  
  
}


function modal_fields(options,hint,cb_yes=_=>0,cb_no=_=>0){
  let bg = document.createElement("div");
  bg.style="display: flex;position:fixed;top:0px;left:0px;width:100%;height:100%;background:rgba(0,0,0,0.5)"
  let div = document.createElement("div");
  div.style="margin:auto auto;width:300px;height:300px;background:#CCCCCC;border:0px solid black;padding:10px;";
  bg.appendChild(div);
  bg.onclick = function(){
    document.body.removeChild(bg);
  }
  div.onclick = function(e){
    e.stopPropagation();
  }
  div.innerHTML = hint;
  let selcont = document.createElement('div');
  selcont.style = `height:230px;overflow:scroll;border:0px solid black;background:white;margin-top:10px;margin-bottom:10px`
  div.appendChild(selcont);
  
  let opts = [];
  for (let k in options){
    let opt = document.createElement("div");
    opt.style = `border-bottom: 1px dotted black;padding:1px 5px;font-size:14px;height:18px;`;
    opt.innerHTML = `<span>${k}</span>`;
    let inp = document.createElement("input");
    inp.style = "float:right;height:18px;font-size:14px;";
    inp.value = options[k];
    opt.appendChild(inp);
    selcont.appendChild(opt);
    opts.push([k,inp]);
  }

  
  
  let btnn = document.createElement("button");
  btnn.innerHTML = "Cancel"
  div.appendChild(btnn);
  btnn.onclick = function(){
    document.body.removeChild(bg);
    cb_no();
  }

  let btny = document.createElement("button");
  btny.style=`float:right;`
  btny.innerHTML = "OK"
  div.appendChild(btny);
  
  btny.onclick = function(){
    for (let i = 0; i < opts.length; i++){
      let [k,d] = opts[i];
      // console.log(d);
      let v = Number(d.value);
      options[k] = v;
    }
    document.body.removeChild(bg);
    cb_yes();
  }
  
  document.body.appendChild(bg);
  
  
}


function beautify(txt){
  txt = txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  try{
    txt = txt.replace(new RegExp("(?<!\/\/.*?);",'g'),'\n')
  }catch(e){
    // stupid safari
  }
  let lines = txt.split('\n').map(x=>x.trim());
  lines = lines.filter(x=>x.length);
  let lvl = 0;
  for (let i = 0; i < lines.length; i++){
    if (lines[i] == '}'){
      lvl--;
    }
    lines[i] = "  ".repeat(Math.max(0,lvl))+lines[i];
    if (lines[i].endsWith('{')){
      lvl++;
    }
  }
  return lines.join('\n');
}


function inspect_vars(){
  let o = ``;
  let ts = `border:1px solid #999999;padding: 1px 3px;`
  let shadow = {};
  for (let i = DBN.state.vars.length-1; i>=0; i--){
    o += `<table style="color:#CCCCCC;font-size:12px;margin:5px;width:calc(100% - 10px)">`;
    for (let k in DBN.state.vars[i]){
      if (k.startsWith('__')) continue;
      //text-align:right;
      o += `<tr><td style="width:80px;${shadow[k]?'text-decoration:line-through':''};${ts}">${k}</td><td style="${ts}">${DBN.state.vars[i][k]}</td></tr>`;
      shadow[k] = true;
    }
    o += `</table>`;
  }
  
  document.getElementById('under-cnv').innerHTML = o;
}



function encode_anim_gif(frames,w,h,delay=5){
  let bytes = [];
  bytes.push(0x47,0x49,0x46,0x38,0x39,0x61);
  bytes.push(w&0xff);
  bytes.push((w>>8)&0xff);
  bytes.push(h&0xff);
  bytes.push((h>>8)&0xff);
  bytes.push(0xf6);
  bytes.push(0,0);
  for (let i = 0; i < 127; i++){
    bytes.push(i*2,i*2,i*2);
  }
  bytes.push(0xff,0xff,0xff);

  bytes.push(0x21,0xff,0x0b);
  bytes.push(0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30);
  bytes.push(0x03,0x01,0xff,0xff,0x00);

  for (let k = 0; k < frames.length; k++){
    let data = frames[k];
    bytes.push(0x21,0xf9,0x04,0b00000100);
    bytes.push(delay&0xff);
    bytes.push((delay>>8)&0xff);
    bytes.push(0xff,0x00);

    bytes.push(0x2c,0,0,0,0);
    bytes.push(w&0xff);
    bytes.push((w>>8)&0xff);
    bytes.push(h&0xff);
    bytes.push((h>>8)&0xff);
    bytes.push(0,7);

    let n = ~~(w*h/126);
    let inc = n*126;
    let exc = w*h-inc;
    for (let i = 0; i < n; i++){
      bytes.push(0x7f);
      bytes.push(0x80);
      for (let j = 0; j < 126; j++){
        bytes.push(~~(data[i*126+j]/2));
      }
    }
    if (exc){
      bytes.push(exc+1);
      bytes.push(0x80);
      for (let i = 0; i < exc; i++){
        bytes.push(~~(data[inc+i]/2));
      }
    }
    bytes.push(0x01,0x81,0x00);
  }
    
  bytes.push(0x3B);
  return bytes;
}

let frames = [];
let W = 255;
let H = 255;
for (let k = 0; k < 100; k++){
  let data = [];

  for (let i = 0; i < H; i++){
    for (let j = 0; j < W; j++){
      data.push((j+k*5)%255);
    }
  }
  frames.push(data);
}
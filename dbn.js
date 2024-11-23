// https://dbn.media.mit.edu/info/vocabulary.html
// https://everything2.com/title/Design+by+Numbers+language+reference

let DBN = new function(){
  
  let state = {};
  let hooks = {
    getmouse:_=>0,
    getkey:_=>0,
    setsize:_=>0,
    readfile:_=>"",
    background:_=>0,
  };
  let options = {
    stepping:0,
    max_stuck_ms:50,
    auto_refresh:1,
  }
  
  function rset(){
    Object.assign(state,{
      W:101,
      H:101,
      pixsize:1,
      canvas:new Array(101*101).fill(0),
      color:100,
      vars:[{}],
      args:[],
      retaddrs:[],
      labels:{},
      sigs:{
        time:{arity:1},
        mouse:{arity:1},
        key:{arity:1},
        array:{arity:1},
        __width:{arity:0},
        __height:{arity:0},
        __get:{arity:2},
      },
      array:[],
      instrs:[],
      norefresh:false,
      frametime:0,
    });
  }
  rset();
  
  let keywords = [
    ['notsmaller?',3],
    ['norefresh',0],
    ['antialias',1],
    ['notsame?',3],
    ['smaller?',3],
    ['__print',1],
    ['forever',1],
    ['refresh',0],
    ['repeat',4],
    ['pause',1],
    ['field',5],
    ['paper',1],
    ['value',1],
    ['same?',3],
    ['size',2],
    ['line',4],
    ['pen',1],
    ['set',2],
  ];
  let precedence = {
    '+':1, 
    '-':1,
    '*':2,
    '/':2,
    '%':2,
  }
  let binops = Object.keys(precedence);
  let pairs = [['(',')'],['[',']'],['{','}'],['<','>']];
  let sigils = [
    ...binops,...pairs.flat()
  ]
  function reset(){
    
  }
  function tokenize(txt){
    let o = [];
    let s = "";
    let lino = 0;
    let ll = 0;
    let com = 0;
    for (let i = 0; i < txt.length; i++){
      function pushtok(){
        let t = s.toLowerCase();
        if (t == 'load'){
          let j = i;
          while (' \n\r\t;'.includes(txt[j]) && j < txt.length){
            j++;
          }
          let j0 = j;
          while (!(' \n\r\t;'.includes(txt[j])) && j < txt.length){
            j++;
          }
          let fname = txt.slice(j0,j);
          console.log(fname);
          let tk2 = tokenize(hooks.readfile(fname));
          tk2.forEach(x=>o.push(x));
          i = j;
          s = ""
        }else{
          if (s.length) o.push({tok:t,pos:[lino,i-ll-s.length]});
          s = "";
        }
      }
      if (txt[i] == '/' && txt[i+1] == '/'){
        pushtok();
        com = 1;
      }
      if (!com){
        if (' \n\r\t;'.includes(txt[i])){
          pushtok();
        }else if (sigils.includes(txt[i])){
          pushtok();
          s = txt[i];
          pushtok();
        }else{
          s += txt[i];
        }
      }
      if ((txt[i] == '\r' && txt[i+1] != '\n') || txt[i] == '\n'){
        com = 0;
        lino++;
        ll = i;
      }
    }
    if (s.length) o.push({tok:s.toLowerCase(),pos:[lino,txt.length-ll-s.length]});
    return o;
  }

  function printtok(x){
    function p(y){
      if (y == -1){
        return "<internal location>"
      }else{
        return y+1;
      }
    }
    return `'${x.tok}' at line ${p(x.pos[0])} position ${p(x.pos[1])}`
  }
  
  function toi32(x){
    x = ~~x;
    
    if (x >= 2147483648){
      return -2147483648+(x-2147483648)
    }
    if (x < -2147483648){
      return 2147483648+(x+2147483648)
    }
    return x;
  }

  function parse(toks,expect_keyword=true){
    let ptr = 0;
    let bound = {};
    function get(){
      let a = toks[ptr++];
      if (a == undefined){
        throw 'expected (more) argument after '+printtok(toks.at(-1));
      }
      
      for (let k = 0; k < pairs.length; k++){
        if (a.tok == pairs[k][0]){
          let lvl = 1;
          for (let i = ptr; i < toks.length; i++){
            if (toks[i].tok == pairs[k][0]){
              lvl ++;
            }else if (toks[i].tok == pairs[k][1]){
              lvl --;
              if (lvl == 0){
                let l = toks.slice(ptr,i);
                ptr = i+1;
                let p = parse(l,a.tok=='{');
                if (a.tok != '{'){
                  return p[0];
                }else{
                  return p;
                }
              }
            }
          }
        }
      }
      return a;
    }
    function getarg(){
      let a = get();
      if (a.tok == '-' || a.tok == '+'){
        let b = get();
        return {cmd:a,arg:[{tok:'0',pos:[-1,-1]},b]}
      }
      return a;
    }
    let o = [];
    let tmp = [];
    function oporder(tmp){
      if (tmp.length == 3){
        return {cmd:tmp[1],arg:[tmp[0],tmp[2]]};
      }else{
        let ops = [];
        for (let i = 1; i < tmp.length-1; i+=2){
          ops.push([i,tmp[i]]);
        }
        ops.sort((a,b)=>[precedence[b[1].tok]-precedence[a[1].tok]]);
        let idx = ops[0][0];
        let l = tmp.slice(0,idx-1);
        let r = tmp.slice(idx+2);
        return oporder([...l,{cmd:tmp[idx],arg:[tmp[idx-1],tmp[idx+1]]},...r]);
      }
    }
    function flushtmp(){
      if (!tmp.length) return;
      // console.log(JSON.stringify(tmp));
      for (let i = tmp.length-1; i>=0; i--){
        if ((tmp[i].tok == '-'||tmp[i].tok == '+') && (tmp[i-1]===undefined || binops.includes(tmp[i-1].tok))  ){
          // console.log("?")
          tmp.splice(i,2,{cmd:tmp[i],arg:[{tok:'0',pos:[-1,-1]},tmp[i+1]]});
        }
      }
      if (tmp[1] && binops.includes(tmp[1].tok)){
        o.push(oporder(tmp))
        tmp.splice(0,Infinity);
      }else if (o.length && o.at(-1).cmd.tok == 'size' && o.at(-1).arg.length<3){
        o.at(-1).arg.push(tmp.shift());
        flushtmp();
      }else{
        // throw 'extra tokens: '+tmp.map(printtok).join(', ');
        // console.log(JSON.stringify(tmp));
        o.push([...tmp]);
      }
      tmp.splice(0,Infinity);
    }
    while (ptr < toks.length){
      let a = get();
      let done = false;
      
      for (let k in state.sigs){
        let arg = [];
        if (a.tok == k){
          for (let j = 0; j < state.sigs[k].arity; j++){
            arg.push(getarg());
          }
          flushtmp();
          o.push({cmd:a,arg});
          done = true;
          break;
        }
      }
      if (expect_keyword){
        for (let i = 0; i < keywords.length; i++){
          let arg = [];
          if (a.tok == keywords[i][0]){
            for (let j = 0; j < keywords[i][1]; j++){
              arg.push(getarg());
            }
            flushtmp();
            o.push({cmd:a,arg});
            done = true;
            break;
          }
        }
      }

      if (a.tok == 'command' || a.tok == 'number'){
        let arg = [];
        do {
          let b = get();
          if (b.tok){
            if (!bound[b.tok])bound[b.tok]=0;
            bound[b.tok]++;
          }
          arg.push(b)
        }while (!Array.isArray(arg.at(-1)));
        done = true;
        state.sigs[arg[0].tok]={arity:arg.length-2};
        flushtmp();
        o.push({cmd:a,arg});
      }
      if (done) continue;
      tmp.push(a);
    }
    flushtmp();
    return o;
  }

  function putpix(x,y,val){
    x-=1;
    y-=1;
    if (x < 0 || x >= state.W) return;
    if (y < 0 || y >= state.H) return;
    state.canvas[y*state.W+x] = val;
  }
  function getpix(x,y){
    x-=1;
    y-=1;
    x = Math.min(Math.max(x,0),state.W-1);
    y = Math.min(Math.max(y,0),state.H-1);
    // console.log(state.canvas[y*state.W+x]);
    return state.canvas[y*state.W+x];
  }
  
  
  function plot_line(x0, y0, x1, y1, val){
    // console.log(arguments);
    x0 = ~~x0;
    y0 = ~~y0;
    x1 = ~~x1;
    y1 = ~~y1;
    let dx = Math.abs(x1 - x0);
    let sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    let sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (1){
      // state.canvas[y0*state.W+x0] = val;
      putpix(x0,y0,val);
      if (x0 == x1 && y0 == y1) break;
      let e2 = 2 * error;
      if (e2 >= dy){
        if (x0 == x1) break;
        error += dy;
        x0 += sx;
      }
      if (e2 <= dx){
        if (y0 == y1) break;
        error += dx;
        y0 += sy;
      }
    }
  }


  function findvar(s){
    for (let i = state.vars.length-1; i >= 0; i--){
      if (s in state.vars[i]){
        return state.vars[i][s];
      }
    }
    return null;
  }

  function tmpvar(){
    var id = "";
    for (var i = 0; i < 5; i++){
      id+=String.fromCharCode(~~(Math.random()*26)+0x61);
    }
    return '__'+id;
  }


  function compile(tree){
    let o = state.instrs;

    function do_compile(tree){

      if (Array.isArray(tree)){
        for (let i = 0; i < tree.length; i++){
          do_compile(tree[i]);
        }
      }else if (tree.cmd === undefined){
        if (tree.tok){
          throw "expected command, got "+printtok(tree);
        }else{
          throw "expected command, got "+JSON.stringify(tree);
        }
      }else if (tree.cmd.tok == 'repeat'){

        o.push({ins:'set',tok:tree.cmd,arg:[tree.arg[0],tree.arg[1]]});
        let stop = {tok:tmpvar(),pos:[-1,-1]};
        let step = {tok:tmpvar(),pos:[-1,-1]};

        o.push({ins:'set',tok:tree.cmd,arg:[stop,tree.arg[2]]});

        o.push({ins:'set',tok:tree.cmd,arg:[step,{tok:'1',pos:[-1,-1]}]});
        o.push({ins:'jlt',tok:tree.cmd,arg:[o.length+2,tree.arg[1],tree.arg[2]]});
        o.push({ins:'set',tok:tree.cmd,arg:[step,{tok:'-1',pos:[-1,-1]}]});

        let idx = o.length;
        do_compile(tree.arg[3]);

        o.push({ins:'set',tok:tree.cmd,arg:[tree.arg[0],{cmd:{tok:'+',pos:[-1,-1]},arg:[ tree.arg[0], step ]}]});
        
        // o.push({ins:'jneq',tok:tree.cmd,arg:[idx,tree.arg[0],{cmd:{tok:'+',pos:[-1,-1]},arg:[ stop, step ]}]})
        
        // but if the user changes the iterator in loop...
        o.push({ins:'jlt',tok:tree.cmd,arg:[o.length+3,step,{tok:'0',pos:[-1,-1]}]});
        o.push({ins:'jlt',tok:tree.cmd,arg:[idx,tree.arg[0],{cmd:{tok:'+',pos:[-1,-1]},arg:[ stop, step ]}]})
        o.push({ins:'jmp',tok:tree.cmd,arg:[o.length+2]})
        o.push({ins:'jlt',tok:tree.cmd,arg:[idx,{cmd:{tok:'+',pos:[-1,-1]},arg:[ stop, step ]},tree.arg[0]]})
        
      }else if (tree.cmd.tok == 'forever'){
        let idx = o.length;
        do_compile(tree.arg[0]);
        o.push({ins:'jmp',tok:tree.cmd,arg:[idx],maybe_mainloop:true});

      }else if (tree.cmd.tok == 'same?'){
        let q = {ins:'jneq',tok:tree.cmd,arg:[-1,tree.arg[0],tree.arg[1]]}
        o.push(q);
        do_compile(tree.arg[2]);
        q.arg[0] = o.length;

      }else if (tree.cmd.tok == 'notsame?'){
        o.push({ins:'jneq',tok:tree.cmd,arg:[o.length+2,tree.arg[0],tree.arg[1]]});
        let q = {ins:'jmp',tok:tree.cmd,arg:[tree.arg[0],tree.arg[1],-1]}
        o.push(q);
        do_compile(tree.arg[2]);
        q.arg[0] = o.length;
      }else if (tree.cmd.tok == 'notsmaller?'){

        let q = {ins:'jlt',tok:tree.cmd,arg:[-1,tree.arg[0],tree.arg[1]]}
        o.push(q);
        do_compile(tree.arg[2]);
        q.arg[0] = o.length;

      }else if (tree.cmd.tok == 'smaller?'){
        o.push({ins:'jlt',tok:tree.cmd,arg:[o.length+2,tree.arg[0],tree.arg[1]]});
        let q = {ins:'jmp',tok:tree.cmd,arg:[-1]}
        o.push(q);
        do_compile(tree.arg[2]);
        q.arg[0] = o.length;

      }else if (tree.cmd.tok == 'command' || tree.cmd.tok == 'number'){
        let q = {ins:'jmp',tok:tree.cmd,arg:[-1]}
        o.push(q);

        state.labels[tree.arg[0].tok] = o.length;

        o.push({ins:'argpop',tok:tree.cmd,arg:tree.arg.slice(1,-1)});
        do_compile(tree.arg.at(-1));
        o.push({ins:'ret',tok:tree.cmd,arg:[]})
        q.arg[0] = o.length;

      }else if (tree.cmd.tok == 'set' && Array.isArray(tree.arg[0])){
        o.push({ins:'field',tok:tree.cmd,arg:[...tree.arg[0],...tree.arg[0],tree.arg[1]]});
      }else if (tree.cmd.tok == 'paper'){
        o.push({ins:'field',tok:tree.cmd,arg:[
          {tok:'0',pos:[-1,-1]},
          {tok:'0',pos:[-1,-1]},
          {cmd:{tok:'__width',pos:[-1,-1]},arg:[]},
          {cmd:{tok:'__height',pos:[-1,-1]},arg:[]},
          tree.arg[0],
        ],hints:{is_bg:true}});
       
        
      }else if (tree.cmd.tok == 'value'){
        o.push({ins:'ret',tok:tree.cmd,arg:[...tree.arg]});

      }else if (keywords.map(x=>x[0]).includes(tree.cmd.tok)){
        o.push({ins:tree.cmd.tok,tok:tree.cmd,arg:tree.arg});
      }else{
        o.push({ins:'call',tok:tree.cmd,arg:[tree.cmd,...tree.arg]});
      }
    }
    do_compile(tree);
    state.pctr = 0;
    return o;
  }


  function execute_step(){
    // console.log('>>>',JSON.stringify(state.instrs[state.pctr]));
    function evalexpr(tree){
      if (Array.isArray(tree)){
        // console.log(tree);
        if (tree.length == 2){
          return evalexpr({cmd:{tok:'__get',pos:[-1,-1]},arg:tree});
        }else if (tree.length == 1){
          return evalexpr(tree[0]);
        }else{
          throw 'unexpected tuple: '+tree.map(printtok).join(', ');
        }
      }
      if ('tok' in tree){
        let v = findvar(tree.tok);
        if (v === null){
          let n = parseFloat(tree.tok);
          if (isNaN(n)){
            throw 'undefined variable: '+printtok(tree);
          }else{
            return n;
          }
        }else{
          return v;
        }
      }else if (tree.cmd.tok == '+'){
        return toi32(evalexpr(tree.arg[0])+evalexpr(tree.arg[1]));
      }else if (tree.cmd.tok == '-'){
        return toi32(evalexpr(tree.arg[0])-evalexpr(tree.arg[1]));
      }else if (tree.cmd.tok == '*'){
        return toi32(evalexpr(tree.arg[0])*evalexpr(tree.arg[1]));
      }else if (tree.cmd.tok == '/'){
        return toi32(evalexpr(tree.arg[0])/evalexpr(tree.arg[1]));
      }else if (tree.cmd.tok == '%'){
        return toi32(evalexpr(tree.arg[0])%evalexpr(tree.arg[1]));
      }else if (tree.cmd.tok == 'time'){
        let n = evalexpr(tree.arg[0]);
        if (n == 1){
          return new Date().getHours();
        }else if (n == 2){
          return new Date().getMinutes();
        }else if (n == 3){
          return new Date().getSeconds();
        }else if (n == 4){
          return ~~(new Date().getMilliseconds()/10);
        }else{
          throw `'time' expected argument to be (1-4) inclusive, got `+n;
        }
      }else if (tree.cmd.tok == 'mouse'){
        let n = evalexpr(tree.arg[0]);
        return hooks.getmouse(n);
      }else if (tree.cmd.tok == 'key'){
        let n = evalexpr(tree.arg[0]);
        return hooks.getkey(n);
      }else if (tree.cmd.tok == 'array'){
        let n = evalexpr(tree.arg[0]);
        // console.log(JSON.stringify(state.array));
        // console.log('arr',n,state.array[n])
        return state.array[n]??0;
      }else if (tree.cmd.tok == '__width'){
        return state.W;
      }else if (tree.cmd.tok == '__height'){
        return state.H;
      }else if (tree.cmd.tok == '__get'){
        
        return getpix(evalexpr(tree.arg[0]),evalexpr(tree.arg[1]));
      }else{
        state.retaddrs.push(state.pctr);
        state.vars.push({});
        let ovl = state.vars.length;
        for(let i = 0; i < tree.arg.length; i++){
          state.args.push(evalexpr(tree.arg[i]));
        }
        state.pctr = state.labels[tree.cmd.tok];
        while (state.instrs[state.pctr].ins != 'ret' || state.vars.length != ovl){
          execute_step();
        }
        let r = evalexpr(state.instrs[state.pctr].arg[0]);
        state.vars.pop();
        state.pctr = state.retaddrs.pop();
        return r;
      }
    }
    // console.log(JSON.stringify(state.instrs[state.pctr]))
    let {ins,tok,arg,hints} = state.instrs[state.pctr++];
    if (ins == 'line'){
      plot_line(...arg.map(evalexpr),state.color);
    }else if (ins == 'field'){
      
      // console.log(',',x0,y0)
      if (hints && hints.is_bg){
        let c = evalexpr(arg.at(-1));
        state.canvas.fill(c);
        hooks.background(c);
        
      }else{
        let [x0,y0,x1,y1,c] = arg.map(evalexpr);
        ;[x0,x1] = [Math.min(x0,x1),Math.max(x0,x1)];
        ;[y0,y1] = [Math.min(y0,y1),Math.max(y0,y1)];
        for (let i = y0; i <= y1; i++){
          for (let j = x0; j <= x1; j++){
            // state.canvas[i*state.W+j] = c;
            putpix(j,i,c);
          }
        }
      }
      
    }else if (ins == 'jmp'){
      state.pctr = arg[0];
    }else if (ins == 'jneq'){
      let a = evalexpr(arg[1]);
      let b = evalexpr(arg[2]);
      if (a != b){
        state.pctr = arg[0];
      }
    }else if (ins == 'jlt'){
      let a = evalexpr(arg[1]);
      let b = evalexpr(arg[2]);
      if (a < b){
        state.pctr = arg[0];
      }
    }else if (ins == 'set'){

      if (arg[0].cmd && arg[0].cmd.tok == 'array'){
        let n = evalexpr(arg[0].arg[0]);
        let r = evalexpr(arg[1]);
        state.array[n] = r;
      }else{
        let r = evalexpr(arg[1]);
        // state.vars.at(-1)[arg[0].tok] = r;
        // state.vars.at(0)[arg[0].tok] = r;
        let found = false;
        for (let i = state.vars.length-1; i >= 0; i--){
          if (arg[0].tok in state.vars[i]){
            state.vars[i][arg[0].tok] = r;
            found = true;
            break;
          }
        }
        if (!found){
          state.vars.at(-1)[arg[0].tok] = r;
        }
      }
    }else if (ins == 'call'){

      state.retaddrs.push(state.pctr);
      state.vars.push({});
      state.pctr = state.labels[arg[0].tok];
      for(let i = 1; i < arg.length; i++){
        // console.log(arg[i])
        // console.log(JSON.stringify(state.vars))
        state.args.push(evalexpr(arg[i]));
      }
      // console.log(state.args);
    }else if (ins == 'size'){
      state.W = evalexpr(arg[0]);
      state.H = evalexpr(arg[1]);
      if (arg[2]){
        state.pixsize = evalexpr(arg[2]);
      }
      state.canvas = new Array(state.W*state.H).fill(0);
      
      hooks.setsize(state.W,state.H,state.pixsize);
    }else if (ins == 'pen'){
      let c = evalexpr(arg[0]);
      // console.log(c)
      state.color = c;
    }else if (ins == 'argpop'){
      // console.log(JSON.stringify(arg),JSON.stringify(state.args));
      for (let i = 0; i < arg.length; i++){
        state.vars.at(-1)[arg[i].tok] = state.args[i];
      }
      state.args.splice(0,Infinity);
    }else if (ins == 'ret'){
      state.vars.pop();
      state.pctr = state.retaddrs.pop();
    }else if (ins == 'norefresh'){
      state.norefresh = true;
    }else if (ins == 'pause'){
      state.frametime = evalexpr(arg[0]);
    }else if (ins == '__print'){
      console.log(evalexpr(arg[0]));
    }
  }
  let frame = 0;
  function execute(){
    if (state.pctr>=state.instrs.length){
      return true;
    }
    let time = new Date().getTime();
    do{
      // console.log(state.instrs[state.pctr]);
      execute_step();

    }while((
        state.pctr<state.instrs.length
      )&&((
          (state.norefresh || options.stepping==0) && 
          state.instrs[state.pctr].ins != 'refresh' && 
          state.instrs[state.pctr].ins != 'pause' &&
          (!options.auto_refresh || !state.instrs[state.pctr].maybe_mainloop) &&
          (new Date().getTime())-time < options.max_stuck_ms
        )||(
          !state.norefresh && options.stepping &&
          (((frame++)%options.stepping)!=0)
    )));

    return !(state.pctr<state.instrs.length);
  }
  this.rset = rset;
  this.state = state;
  this.tokenize = tokenize;
  this.parse = parse;
  this.compile = compile;
  this.execute_step = execute_step;
  this.execute = execute;
  this.keywords = keywords;
  this.hooks = hooks;
  this.options = options;
}

if (typeof module != 'undefined'){
  module.exports = DBN;
}

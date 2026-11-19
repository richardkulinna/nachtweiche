(() => {
  'use strict';

  const width = 840;
  const height = 500;
  const circle = Math.PI * 2;
  const gate = [400, 328];
  const clamp = (number, low, high) => Math.max(low, Math.min(high, number));
  const fraction = number => number - Math.floor(number);
  const noise = number => fraction(Math.sin(number * 12.9898 + 78.233) * 43758.5453);
  const project = (u, v, z = 0) => [354 + u * .91 + v * .80, 306 - u * .30 + v * .38 - z];

  class NachtScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d', { alpha: false });
      this.cache = document.createElement('canvas');
      this.position = { x: gate[0], y: gate[1] };
      this.particles = [];
      this.arrivalAt = -100;
      this.people = [];
      this.visiblePeople = [];
      this.passengers = [];
    }

    gateCenter() {
      return { ...this.position };
    }

    burst(strength = .5) {
      const energy = clamp(Number(strength) || 0, 0, 1);
      if (this.reduced || !Number.isFinite(this.time)) return;
      for (let i = 0; i < 2 + Math.floor(energy * 4); i++) {
        const angle = Math.random() * circle;
        this.particles.push({
          birth: this.time, dx: Math.cos(angle) * (50 + energy * 74),
          dy: Math.sin(angle) * (21 + energy * 27), lift: 145 + energy * 170,
          life: .64 + energy * .34, seed: Math.random() * 100
        });
      }
      this.particles = this.particles.slice(-32);
    }

    path(points, fill, stroke, weight = 1, closed = true) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
      if (closed) ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.stroke(); }
    }

    line(start, end, ink = this.ink, weight = 1) {
      this.path([start, end], null, ink, weight, false);
    }

    oval(x, y, rx, ry, fill, stroke, weight = 1, from = 0, to = circle) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, from, to);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.stroke(); }
    }

    palette(view) {
      const night = view.theme === 'dark';
      const polar = ['pol','polarring'].includes(this.routeId);
      this.paper = night ? '#242420' : '#f8f7f2';
      this.ink = view.contrast ? (night ? '#ffffff' : '#11110f') : (night ? '#e9e3d4' : '#292822');
      this.pale = polar ? (night ? '#2b3438' : '#e9efee') : (night ? '#30302b' : '#eeede7');
      this.faint = polar ? (night ? '#53676c' : '#abbebf') : (night ? '#51504a' : '#c5c2b8');
      this.mid = polar ? (night ? '#a3bfc0' : '#536b70') : (night ? '#a5a299' : '#706d63');
      this.glass = polar ? (night ? '#354b4e' : '#d6e0df') : (night ? '#3c3d39' : '#deddd6');
      this.red = night ? '#ff7963' : '#ba3827';
      this.vehicleStripe = this.simple ? this.mid : this.red;
      this.night = night;
    }

    draw(view, secondsTime) {
      const canvas = this.canvas;
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      if (!cssWidth || !cssHeight) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const actualWidth = Math.round(cssWidth * ratio);
      const actualHeight = Math.round(cssHeight * ratio);
      if (canvas.width !== actualWidth || canvas.height !== actualHeight) {
        canvas.width = actualWidth;
        canvas.height = actualHeight;
      }
      const contain = Math.min(cssWidth / width, cssHeight / height);
      const scale = cssWidth < 640 ? Math.max(contain * .92, Math.min(cssHeight / 470, cssWidth / 585)) : contain * .93;
      const left = (cssWidth - width * scale) / 2;
      const top = (cssHeight - height * scale) / 2;
      this.position = { x: left + gate[0] * scale, y: top + gate[1] * scale };
      this.routeIndex = Math.max(0, Math.floor(view.route || 0));
      this.routeId = view.routeId || window.Engine?.ROUTES?.[this.routeIndex]?.id || 'bus';
      this.prestige = clamp(Math.floor(view.prestige || 0), 0, 9);
      this.detail = clamp(view.detail ?? .75, 0, 1);
      this.simple = this.routeIndex <= 3 && this.prestige < 3;
      this.bounds = { left: -left / scale, right: (cssWidth - left) / scale };
      this.palette(view);
      this.time = secondsTime;
      this.reduced = view.reduced;
      const time = view.reduced ? 0 : secondsTime;
      const extension = Math.min(8, Math.floor(this.routeIndex / 3 + Math.min(1, (view.level || 0) / 24)));
      const detailed = this.detail >= .5;
      const cacheKey = [this.paper, this.ink, this.routeId, extension, this.prestige, detailed].join('/');
      if (this.cacheKey !== cacheKey) {
        this.cacheKey = cacheKey;
        this.cache.width = width * 2;
        this.cache.height = height * 2;
        this.ctx = this.cache.getContext('2d');
        this.ctx.scale(2, 2);
        this.world(extension, detailed);
      }

      this.ctx = this.context;
      this.ctx.setTransform(1,0,0,1,0,0);
      this.ctx.fillStyle = this.paper;
      this.ctx.fillRect(0,0,actualWidth,actualHeight);
      this.ctx.setTransform(scale * ratio, 0, 0, scale * ratio, left * ratio, top * ratio);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.drawImage(this.cache, 0, 0, width, height);
      this.ctx.globalAlpha = this.simple ? .76 : 1;
      this.vehicles(view.arrival, secondsTime);
      this.ctx.globalAlpha = 1;
      const people = this.crowd(view, time);
      let index = 0;
      while (index < people.length && people[index].y < gate[1] - 9) this.drawWalker(people[index++]);
      this.revolver(view);
      while (index < people.length) this.drawWalker(people[index++]);
      this.drawParticles();
    }

    world(extension, detailed) {
      const ctx = this.ctx;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      this.landscape();
      this.skyline(extension);
      this.quay(detailed && !this.simple);
      this.landmark(detailed);
      this.tracks(-112);
      this.tracks(-56);
      for (const [u,v] of [[106,-220],[218,-228],[-123,-233]]) {
        const [x,y] = project(u,v);
        this.tree(x,y,.7);
      }
      this.pavilion(detailed && !this.simple);
      this.furniture();
      this.prestigePlaza();
      this.softenEdges();
    }

    softenEdges() {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      const horizontal = ctx.createLinearGradient(0,0,width,0);
      horizontal.addColorStop(0,'transparent');
      horizontal.addColorStop(.061,'#fff');
      horizontal.addColorStop(.93,'#fff');
      horizontal.addColorStop(1,'transparent');
      ctx.fillStyle = horizontal;
      ctx.fillRect(0,0,width,height);
      const vertical = ctx.createLinearGradient(0,0,0,height);
      vertical.addColorStop(0,'transparent');
      vertical.addColorStop(.12,'#fff');
      vertical.addColorStop(.85,'#fff');
      vertical.addColorStop(1,'transparent');
      ctx.fillStyle = vertical;
      ctx.fillRect(0,0,width,height);
      ctx.restore();
    }

    skyline(extension) {
      const ctx = this.ctx;
      ctx.globalAlpha = this.simple ? .36 : .58;
      const blocks = [[-216,-270,54,36,24],[-49,-302,83,45,43],[49,-275,39,34,31],
        [121,-303,80,39,63],[199,-290,67,42,40],[281,-264,49,37,73],[378,-237,63,44,31],
        [439,-197,88,43,48],[435,-133,62,40,32],[-277,-288,42,30,27]];
      const polar = this.routeId === 'pol' || this.routeId === 'polarring';
      const distant = this.simple ? [blocks[3],blocks[5],blocks[7]] : blocks;
      for (let i = 0; i < (polar ? 4 : distant.length); i++) this.building(...distant[i], this.faint, i);
      ctx.globalAlpha = .84;
      const later = [[291,-216,64,50,88],[373,-169,59,39,119],[432,-123,75,43,77],[470,-75,76,63,104],
        [210,-320,35,41,104],[318,-300,39,28,112],[427,-243,40,36,113],[492,-202,49,42,126]];
      if (polar) {
        this.building(303,-213,47,35,21,this.mid,1);
        if (this.routeId === 'polarring') this.building(376,-234,31,30,25,this.mid,0);
      } else {
        later.slice(0, extension).forEach((block, index) => this.building(...block, this.mid, index));
      }
      ctx.globalAlpha = 1;
      if (this.simple) return;
      this.oval(704, 72, 22, 22, null, this.faint, .75);
      for (let i = 0; i < 5; i++) {
        const x = 502 + i * 54;
        const y = 57 + noise(i) * 31;
        this.path([[x, y + 5], [x + 7, y + 2], [x + 11, y + 6], [x + 16, y + 1], [x + 23, y + 2]], null, this.faint, .75, false);
      }
    }

    landscape() {
      const route = this.routeId;
      if (route === 'pol' || route === 'polarring' || route === 'horizont' || route === 'tunnel') {
        const ridge = [[0,122],[57,106],[129,52],[168,85],[215,64],[243,75],[314,24],[366,69],
          [392,58],[447,101],[498,86],[533,110],[598,70],[652,96],[723,47],[775,89],[840,63],[840,192],[0,197]];
        this.path(ridge,this.pale,this.faint,1);
        for (const [x,y,v] of [[129,52,43],[314,24,65],[598,70,32],[723,47,50]]) {
          this.path([[x-v,y+v*.73],[x,y],[x+v*.7,y+v*.6],[x+v*.28,y+v*.45],[x+1,y+v*.35],[x-v*.23,y+v*.56]],this.paper,this.faint,.65);
          this.path([[x,y],[x-v*.1,y+v*.31],[x-v*.7,y+v*.84]],null,this.mid,.75,false);
        }
        if (route !== 'tunnel') {
          const ctx = this.ctx;
          const isPolar = route !== 'horizont';
          const color = this.night ? (isPolar ? '#8fcab7' : '#f0af90') : (isPolar ? '#559487' : '#b17b66');
          const limit = route === 'pol' ? 17 : 31;
          for (let i = 0; i < limit; i++) {
            ctx.globalAlpha = .12 + (1 - i / limit) * .22;
            const points = Array.from({length: 37}, (_,step) => {
              const x = 342 + step * 14;
              const ribbon = -1.1 + step * .131;
              const y = 51 + Math.sin(ribbon) * 21 - step * 1.25;
              return [x,y + i * (.65 + .42 * Math.cos(ribbon * 2.3))];
            });
            this.path(points,null,color,i % 4 === 0 ? 1.25 : .65,false);
          }
          ctx.globalAlpha = 1;
          if (route !== 'pol') {
            for (let i = 0; i < 26; i++) {
              const x = 380 + noise(i*7 + 91)*451;
              const y = noise(i*3 + 471)*82;
              this.oval(x,y, .5 + noise(i) * 1.2,.6,this.mid);
            }
          }
        }
      } else if (['faehre','ozean','meerbruecke','fracht'].includes(route)) {
        const water = this.night ? '#343d3b' : '#dae0d6';
        this.path([[420,117],[695,53],[840,51],[840,211],[644,166]],water);
        for (let i = 0; i < 65; i++) {
          const x = 586 + noise(i * 3) * 263;
          const y = 72 + noise(i * 3 + 1) * 109;
          if (x < 645 && y < 108) continue;
          this.line([x,y],[x + 3 + noise(i * 3 + 2) * 20,y - 1.85],this.faint,.8);
        }
      }
    }

    landmark(detailed) {
      const id = this.routeId;
      const sea = ['faehre','ozean','meerbruecke','fracht'].indexOf(id);
      const air = ['flug','stratosphaere'].indexOf(id);
      const future = ['magnet','versuch','vakuum','zubringer','horizont'].indexOf(id);
      const intercity = ['express','kontinental','kontinentalring'].indexOf(id);

      if (sea >= 0) {
        const water = this.night ? '#343d3b' : '#d7ded3';
        this.path([[509,126],[778,56],[840,70],[840,133],[657,136],[536,154]],water,this.faint,1);
        if (id === 'meerbruecke') {
          for (const tower of [[632,138,91],[752,104,55]]) {
            const [x,y,top] = tower;
            for (const post of [0,12]) this.path([[x+post-3,y],[x+post-3,top],[x+post+3,top],[x+post+3,y]],this.paper,this.ink,1.23);
            this.line([x - 4,top + 10],[x + 16,top + 10],this.ink,2.1);
          }
          this.path([[597,141],[777,84],[834,82],[834,89],[597,150]],this.paper,this.ink,1.2);
          this.path([[570,116],[625,90],[646,102],[672,109],[711,96],[756,57],[784,67],[818,72]],null,this.ink,1.5,false);
          for (let i = 0; i < 14; i++) this.line([631+i*12,134-i*3.65],[631+i*12,91+Math.sin(i*.38)*15],this.mid,.8);
        } else {
          const positions = sea === 0 ? [697] : sea === 3 ? [584,701,797] : [619,788];
          for (const [index,x] of positions.entries()) this.crane(x,139-index*13,52+(x%19),index%2===1);
          if (id === 'fracht') {
            for (let i = 0; i < 9; i++) {
              const x = 557 + i * 24;
              const y = 162 - i * 6.5;
              this.path([[x,y-10],[x+18,y-15],[x+26,y-12],[x+26,y-4],[x+7,y+1],[x,y-2]],i%3===0 ? this.glass : this.pale,this.ink,.85);
              this.line([x+7,y-7],[x+7,y+1],this.mid,.65);
            }
          }
          if (id === 'ozean') this.liner(719,124);
        }
        if (detailed) for (let i = 0; i < 14; i++) {
          const x = 581 + noise(i + 70)*238;
          const y = 96 + noise(i + 22)*42;
          if (id !== 'ozean' || x < 610 || x > 799) this.line([x,y],[x+11,y-2],this.faint,.6);
        }
      } else if (id === 'pol' || id === 'polarring') {
        this.observatory(id === 'pol' ? 674 : 716,134,id === 'pol' ? .84 : 1.19);
        if (id === 'polarring') this.observatory(601,153,.53);
        for (let i = 0; i < 7; i++) {
          const x = 477 + i*49;
          const y = 181 - i*8;
          this.path([[x-19,y-1],[x,y-5],[x+16,y-2],[x+22,y+2],[x-11,y+4]],this.paper,this.faint,.75);
        }
      } else if (future >= 0) {
        this.guideway(future);
      } else if (air >= 0) {
        const x = air ? 706 : 669;
        const y = air ? 142 : 159;
        this.path([[x-10,y],[x-6,y-73],[x+7,y-77],[x+11,y-6]],this.pale,this.ink,1.2);
        this.oval(x+1,y-78,24,8,this.glass,this.ink,1.2);
        this.path([[x-25,y-84],[x+24,y-84],[x+19,y-72],[x-17,y-70]],this.ink,this.ink,1);
        this.oval(x,y-84,25,7,this.paper,this.ink,1.1);
        for (let i = -18; i < 20; i+=8) this.line([x+i,y-79],[x+i+1,y-75],this.paper,.8);
        this.line([x,y-91],[x,y-108],this.ink,1);
        this.oval(x,y-108,2.8,2.4,this.red);
        this.line([x+7,y-102],[x+33,y-111],this.faint,1.1);
        if (air) {
          this.line([x+9,y-99],[x+81,y-125],this.mid,.95);
          this.line([x+39,y-105],[x+107,y-125],this.red,.7);
          this.path([[503,158],[559,126],[621,124],[660,137],[608,161],[525,169]],this.glass,this.ink,1.25);
          this.line([514,155],[620,128],this.paper,1.4);
        }
      } else if (intercity >= 0) {
        for (let i = 0; i <= intercity; i++) this.intercityHall(584 + i*70,171-i*21,1-i*.13);
      } else if (id === 'tram') {
        for (const [x,y] of [[488,202],[616,159],[752,117]]) {
          this.line([x,y],[x,y-47],this.ink,1.5);
          this.path([[x,y-42],[x+9,y-51],[x+32,y-52]],null,this.ink,1.2,false);
        }
        this.line([474,155],[831,38],this.mid,.82);
      } else if (id === 'post' || id === 'metro' || id === 'zug' || id === 'tunnel') {
        const x = 592;
        const y = 163;
        const word = {post:'NACHTPOST', metro:'U-BAHN', zug:'REGIONAL', tunnel:'BASIS TUNNEL'}[id];
        this.path([[x-79,y+24],[x-31,y-31],[x+64,y-48],[x+103,y-22],[x+78,y+14],[x-36,y+43]],this.glass,this.mid,1.1);
        this.path([[x-45,y+29],[x-14,y-14],[x+65,y-37],[x+90,y-21],[x+67,y+8],[x-30,y+34]],this.pale,this.ink,1.5);
        this.path([[x-22,y+26],[x-3,y-7],[x+64,y-26],[x+78,y-19],[x+62,y+3]],this.mid,this.ink,1.25);
        this.plaque(x+17,y-12,word,59);
      }
    }

    crane(x,y,h,right) {
      const direction = right ? 1 : -1;
      this.path([[x-18,y+2],[x+21,y-7],[x+19,y-17],[x-12,y-10]],this.glass,this.ink,1.05);
      this.path([[x-6,y-8],[x-6,y-h],[x+4,y-h-5],[x+6,y-10]],this.paper,this.ink,1.1);
      this.path([[x-5,y-h],[x+49*direction,y-h+5],[x+49*direction,y-h+10],[x-5,y-h+6]],this.pale,this.ink,1.3);
      this.line([x,y-h-8],[x+49*direction,y-h+5],this.ink,1);
      this.line([x+44*direction,y-h+8],[x+44*direction,y-h+36],this.ink,.85);
      this.line([x+43*direction,y-h+36],[x+48*direction,y-h+36],this.red,1.8);
      for (let i=0;i<5;i++) this.line([x-5,y-10-i*9],[x+5,y-19-i*9],this.mid,.8);
    }

    observatory(x,y,scale) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(scale,scale);
      this.oval(6,8,72,24,this.pale,this.faint,1);
      this.path([[-52,-14],[57,-14],[57,3],[39,17],[-36,17],[-52,4]],this.glass,this.ink,1.3);
      this.oval(0,-14,57,19,this.paper,this.ink,1.4);
      this.oval(0,-14,52,43,this.pale,this.ink,1.4,Math.PI,circle);
      this.oval(3,-14,18,43,null,this.mid,1.15,Math.PI,circle);
      this.oval(4,-14,43,43,null,this.mid,.8,Math.PI,circle);
      this.path([[7,-55],[38,-51],[29,-40],[14,-42],[14,-29],[5,-27]],this.ink,this.ink,1);
      this.line([7,-25],[7,-11],this.red,1.7);
      this.plaque(7,11,'OBSERVATORIUM',81);
      ctx.restore();
    }

    intercityHall(x,y,scale) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(scale,scale);
      this.path([[-84,15],[-84,-7],[-66,-35],[-21,-65],[45,-52],[72,-33],[72,-5]],this.glass,this.ink,1.4);
      this.path([[-72,12],[-72,-5],[-57,-31],[-17,-52],[40,-43],[62,-29],[62,-8]],this.pale,this.ink,1.25);
      for (let i=0;i<10;i++) this.line([-71+i*14,11-i*1.8],[-64+i*13,-22-Math.sin(i/9*Math.PI)*26],this.mid,1.12);
      this.line([-83,-1],[65,-23],this.ink,1.15);
      this.plaque(-7,-10,'FERNVERKEHR',67);
      ctx.restore();
    }

    guideway(form) {
      const start = 457 - form*10;
      for (let i = 0; i < 5; i++) {
        const x = start + 51 + i*76;
        const y = 200 - i*23;
        this.path([[x-3,y],[x-3,y-51],[x+4,y-56],[x+6,y-5]],this.pale,this.ink,1.2);
      }
      this.path([[start,153],[514,114],[601,87],[716,61],[840,32],[840,49],[713,82],[598,112],[527,133],[start,174]],this.pale,this.ink,1.6);
      this.path([[start,151],[514,113],[601,86],[716,60],[840,31]],null,this.paper,2.4,false);
      this.path([[start,168],[523,126],[600,101],[718,73],[840,43]],null,this.red,form >= 2 ? 2 : 1.12,false);
      if (form > 0) {
        for (let i = 0; i < (form > 2 ? 16 : 10); i++) {
          const x = 540 + i*19;
          const y = 122 - i*5.1;
          this.path([[x-10,y+4],[x-12,y-9],[x-8,y-21],[x+2,y-28],[x+11,y-23],[x+15,y-12],[x+13,y-1]],null,this.mid,1.3,false);
          this.line([x+4,y-27],[x+23,y-30],this.faint,1);
        }
        this.plaque(600,115,['','VERSUCH','VAKUUM','NULLSERIE','HORIZONT'][form],63);
      }
      if (form >= 3) this.observatory(747,112,form===4 ? .7 : .52);
    }

    plaque(x,y,text,w) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x,y);
      ctx.transform(1,-.26,0,1,0,0);
      ctx.fillStyle = this.ink;
      ctx.fillRect(-w/2,-9,w,13);
      ctx.fillStyle = this.paper;
      ctx.font = '700 7px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(text,0,0);
      ctx.restore();
    }

    prestigePlaza() {
      if (this.prestige < 4) return;
      const y = gate[1];
      const x = gate[0];
      this.oval(x,y,106,46,null,this.faint,.7);
      if (this.prestige < 5) return;
      const rings = this.prestige >= 8 ? 3 : this.prestige >= 7 ? 2 : 1;
      for (let i=0;i<rings;i++) {
        this.oval(x,y,109+i*7,47+i*3,null,this.mid,.95,0.17,Math.PI-.17);
      }
      for (let i = 0; i < 12 + rings*4; i++) {
        const angle = i*circle/(12+rings*4);
        const x0 = x + Math.cos(angle)*(107+rings*6);
        const y0 = y + Math.sin(angle)*(46+rings*3);
        this.oval(x0,y0,2.4,1.3,this.red,this.paper,.5);
      }
      if (this.prestige >= 6) {
        for (const [x0,y0] of [[304,289],[493,276],[509,330],[292,339]]) {
          this.oval(x0,y0,8,3,this.pale,this.mid,.6);
          this.line([x0,y0],[x0,y0-23],this.ink,1.5);
          this.oval(x0,y0-23,3.6,2.9,this.red,this.paper,.7);
        }
      }
      if (this.prestige >= 7) {
        this.line([490,382],[490,359],this.ink,1.15);
        this.plaque(490,354,'LEITSTELLE',58);
      }
      if (this.prestige >= 9) {
        for (const [x0,y0] of [[278,335],[520,335]]) {
          const side = x0 < x ? -1 : 1;
          this.line([x0,y0],[x0,y0-29],this.ink,1.5);
          this.path([[x0,y0-29],[x0+side*22,y0-32],[x0+side*22,y0-19],[x0,y0-15]],this.red,this.ink,1.05);
          this.line([x0+side*4,y0-19],[x0+side*18,y0-24],this.paper,1);
        }
      }
    }

    building(u, v, w, d, h, outline, form) {
      const back = project(u, v, h);
      const far = project(u + w, v, h);
      const side = project(u + w, v + d, h);
      const front = project(u, v + d, h);
      this.path([front, side, project(u + w, v + d), project(u, v + d)], this.pale, outline, .85);
      this.path([back, front, project(u, v + d), project(u, v)], this.paper, outline, .85);
      if (form % 2) {
        const ridge = project(u, v + d / 2, h + 13);
        const tip = project(u + w, v + d / 2, h + 13);
        this.path([back, ridge, tip, far], this.paper, outline, .65);
        this.path([ridge, front, side, tip], this.glass, outline, .65);
        this.path([back, front, ridge], this.pale, outline, .65);
      } else {
        this.path([back, front, side, far], this.paper, outline, .65);
      }
      for (let floor = 13; floor < h - 4; floor += 13) {
        for (let column = 10; column < w - 3; column += 13) {
          this.line(project(u + column, v + d, floor), project(u + column + 4, v + d, floor), outline, 1.6);
        }
      }
    }

    quay(detailed) {
      if (this.simple) {
        this.path([[17,267],[532,114],[695,73],[822,122],[822,270],[698,320],[297,461],[96,428],[24,370]],this.pale);
        this.path([[19,295],[520,145],[704,98],[825,143],[826,265],[683,310],[293,448],[98,417],[29,361]],this.paper);
        const streetStart = project(-174,216);
        const streetEnd = project(295,216);
        this.path([streetStart,streetEnd,project(289,274),project(-113,274)],this.pale);
        this.line(streetStart,streetEnd,this.faint,1);
        this.line(project(-151,230),project(270,230),this.faint,.65);
        for (let u = -89; u < 240; u += 63) this.line(project(u,253),project(u+16,253),this.faint,.85);
        return;
      }
      const minU = -391;
      const maxU = 515;
      this.path([project(minU,-248), project(maxU,-248), project(maxU,265), project(minU,265)], this.pale, this.ink, 1.05);
      this.path([project(minU,-202), project(maxU,-202), project(maxU,265), project(minU,265)], this.paper, this.mid, .5);
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = .46;
      for (let v = -188; v < 270; v += 20) this.line(project(minU,v), project(maxU,v), this.faint, .65);
      for (let u = minU; u < maxU; u += 38) {
        for (let v = -186; v < 270; v += 40) {
          this.line(project(u,v), project(u,v + 17), this.faint, .65);
          this.line(project(u + 19,v + 20), project(u + 19,v + 37), this.faint, .65);
        }
      }
      ctx.restore();
      this.path([project(minU,221), project(maxU,221), project(maxU,302), project(minU,302)], this.pale, this.mid, 1);
      this.line(project(minU,226), project(maxU,226), this.mid, .9);
      for (let u = minU; u < maxU; u += 42) this.line(project(u,265), project(u + 18,265), this.mid, 1.2);
      for (let u = -230; u < 115; u += 10) {
        this.line(project(u,193), project(u,216), this.paper, 2.9);
      }
      if (!detailed) return;
      for (let i = 0; i < 310; i++) {
        const u = minU + noise(i + 200) * 870;
        const v = -202 + noise(i + 600) * 420;
        this.line(project(u,v), project(u + 2.2,v), this.faint, .5);
      }
    }

    tracks(v) {
      const start = this.simple ? -181 : -258;
      const end = this.simple ? 490 : 535;
      this.path([project(start,v - 18),project(end,v - 18),project(end,v + 18),project(start,v + 18)], this.glass, this.mid, .75);
      for (let u = start+2; u < end-1; u += this.simple ? 15 : 9) {
        this.line(project(u,v - 14), project(u,v + 14), this.mid, this.simple ? .88 : 1.2);
      }
      for (const offset of [-10, 10]) {
        this.line(project(start,v + offset), project(end,v + offset), this.simple ? this.mid : this.ink, this.simple ? 1.45 : 2.35);
        this.line(project(start,v + offset,1), project(end,v + offset,1), this.paper, .65);
      }
      this.line(project(start,v + 23), project(end,v + 23), this.simple ? this.faint : this.mid, 1);
      if (!this.simple) for (let u = start + 8; u < end - 5; u += 17) this.line(project(u,v + 25), project(u + 6,v + 25), this.mid, .8);
    }

    pavilion(detailed) {
      const ctx = this.ctx;
      const near = this.simple ? -166 : -195;
      const far = 77;
      const left = -216;
      const right = -81;
      const arch = (u, f, trim = 0) => project(u, left + (right - left) * f, 74 + Math.sin(f * Math.PI) * 55 + trim);
      const curve = (u, from = 0, to = 1, trim = 0) => Array.from({ length: 21 }, (_, i) => arch(u, from + (to - from) * i / 20, trim));

      this.path([project(near - 9,left - 13),project(far + 23,left - 13),project(far + 23,right + 16),project(near - 9,right + 16)], this.pale, this.ink, 1.3);
      this.path([project(near - 5,left - 5,5),project(far + 12,left - 5,5),project(far + 12,right + 6,5),project(near - 5,right + 6,5)], this.glass, this.ink, 1.05);
      this.path([project(near,left,6),project(far,left,6),project(far,left,74),project(near,left,74)], this.glass, this.ink, 1.0);
      this.path([project(near,right,6),project(far,right,6),project(far,right,74),project(near,right,74)], this.glass, this.ink, 1.6);
      const gap = this.simple ? 27 : 18;
      for (let u = near; u < far - 4; u += gap) {
        this.line(project(u,right,6),project(u,right,74),this.mid,.75);
        this.line(project(u,right,35),project(u + 12,right,64),this.paper,1.15);
        if ((u - near) % 54 === 0) this.line(project(u,right,4),project(u,right,75),this.ink,2.5);
      }
      for (const z of [12,27,58,72]) this.line(project(near,right,z),project(far,right,z),this.ink,.9);

      this.path([...curve(near), project(near,right,5), project(near,left,5)], this.glass, this.ink, 1.8);
      for (let i = 1; i < 10; i += this.simple ? 2 : 1) {
        const f = i / 10;
        const v = left + (right - left) * f;
        this.line(arch(near,f),project(near,v,6),this.ink,i % 3 ? .85 : 1.55);
        this.line(project(near,v,24),project(near,v + 8,47),this.paper,1.25);
      }
      for (const z of [19,40,72]) this.line(project(near,left,z),project(near,right,z),this.ink,.9);

      for (let i = 0; i < 12; i++) {
        const a = i / 12;
        const b = (i + 1) / 12;
        const glass = [this.glass, this.pale, this.paper, this.pale][i % 4];
        this.path([...curve(near,a,b),...curve(far,a,b).reverse()],glass,this.mid,.75);
        if (detailed && i % 4 !== 2) {
          for (let u = near + 3; u < far; u += 6) {
            this.line(arch(u,a + .011),arch(u + 5,b - .011),this.faint,.65);
          }
        }
      }
      for (let u = near; u <= far; u += 34) {
        this.path(curve(u),null,this.ink,u === near ? 2.5 : 1.25,false);
        this.path(curve(u,.015,.985,2.7),null,this.paper,1,false);
      }
      this.path(curve(near,0,1,5),null,this.ink,1.25,false);
      this.path(curve(far),null,this.ink,1.4,false);
      this.line(arch(near,.5,2),arch(far,.5,2),this.ink,1.35);
      this.line(arch(near,1),arch(far,1),this.ink,2.75);
      this.line(arch(near,1,3),arch(far,1,3),this.paper,1.2);

      const [x,y] = project(-139,right,53);
      ctx.save();
      ctx.transform(1,-.33,0,1,x,y);
      ctx.fillStyle = this.ink;
      ctx.fillRect(-12,-10,126,23);
      ctx.strokeStyle = this.paper;
      ctx.lineWidth = .55;
      ctx.strokeRect(-9,-7,120,17);
      ctx.fillStyle = this.paper;
      ctx.font = '700 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('NACHTBAHNHOF', 51, 5);
      ctx.restore();

      const [clockX,clockY] = project(-146,right,79);
      this.oval(clockX,clockY,12,13,this.paper,this.ink,1.8);
      for (let i = 0; i < 12; i++) {
        const angle = i * circle / 12;
        this.line([clockX + Math.cos(angle) * 8.2,clockY + Math.sin(angle) * 8.7],
          [clockX + Math.cos(angle) * 9.4,clockY + Math.sin(angle) * 10],this.ink,.9);
      }
      this.line([clockX,clockY],[clockX - 4,clockY - 3],this.ink,1.1);
      this.line([clockX,clockY],[clockX + 1,clockY - 6],this.simple ? this.mid : this.red,1);
    }

    furniture() {
      const trees = this.simple ? [[-225,114,.96],[102,177,.9],[284,92,.87]] :
        [[-263,105,1.15],[-226,126,.9],[83,173,.9],[122,191,1.2],[283,96,.9],[323,93,1.05]];
      for (const [u, v, size] of trees) {
        const [x,y] = project(u,v);
        this.tree(x,y,size);
      }
      const lamps = this.simple ? [[-162,175],[170,62],[350,52]] : [[-156,11],[-60,141],[90,8],[170,62],[313,-30],[350,52],[-162,175]];
      for (const [u,v] of lamps) {
        const [x,y] = project(u,v);
        this.oval(x + 5,y,12,3,this.pale);
        this.line([x,y],[x,y - 45],this.ink,1.6);
        this.path([[x,y - 44],[x + 4,y - 49],[x + 13,y - 49]],null,this.ink,1.1,false);
        this.oval(x + 12,y - 48,6,1.8,this.paper,this.ink,.85);
      }
      const seats = this.simple ? [[93,148],[206,56]] : [[-209,46],[63,111],[206,56],[-95,173]];
      for (const [u,v] of seats) {
        this.line(project(u,v,0),project(u,v,9),this.ink,1.15);
        this.line(project(u + 28,v,0),project(u + 28,v,9),this.ink,1.15);
        this.path([project(u - 2,v - 4,10),project(u + 30,v - 4,10),project(u + 30,v + 4,10),project(u - 2,v + 4,10)],this.pale,this.ink,1);
        this.line(project(u - 2,v - 4,16),project(u + 30,v - 4,16),this.ink,1.5);
      }
      const [x,y] = project(-163,155);
      this.line([x,y],[x,y - 32],this.ink,1.5);
      this.path([[x - 18,y - 36],[x + 25,y - 48],[x + 25,y - 34],[x - 18,y - 22]],this.red,this.ink,1);
      const ctx = this.ctx;
      ctx.save();
      ctx.transform(1,-.28,0,1,x + 2,y - 28);
      ctx.fillStyle = this.night ? this.paper : '#fff5e7';
      ctx.font = '700 7px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GLEIS 1',0,0);
      ctx.restore();
      for (let u = this.simple ? 36 : -190; u < 210; u += this.simple ? 44 : 28) {
        const [x,y] = project(u,207);
        this.line([x,y],[x,y - 8],this.ink,1.8);
      }
    }

    tree(x, y, scale) {
      this.oval(x + 8 * scale,y + scale,17 * scale,5 * scale,this.pale);
      this.path([[x - 17 * scale,y + 3],[x - 5 * scale,y - 7],[x + 16 * scale,y - 4],[x + 9 * scale,y + 6]],this.pale,this.mid,.65);
      this.line([x,y],[x,y - 41 * scale],this.ink,1.3);
      this.line([x,y - 13 * scale],[x + 10 * scale,y - 32 * scale],this.mid,.75);
      const foliage = Array.from({ length: 27 }, (_, i) => {
        const angle = i * circle / 27;
        const roughness = .8 + noise(i + 60) * .22;
        return [x + Math.cos(angle) * 20 * scale * roughness, y - 40 * scale + Math.sin(angle) * 25 * scale * roughness];
      });
      this.path(foliage,this.pale,this.mid,.85);
      for (let i = 0; i < (this.simple ? 20 : 53); i++) {
        const angle = i * 2.399963;
        const r = Math.sqrt(noise(i + 20)) * 15 * scale;
        const px = x + Math.cos(angle) * r;
        const py = y - 40 * scale + Math.sin(angle) * r * 1.35;
        this.line([px,py],[px + scale * 3,py - scale],i % 3 ? this.mid : this.ink,.65);
      }
    }

    vehicles(arrival, time) {
      const incoming = String(arrival || '').toLowerCase();
      if (this.lastArrival !== incoming) {
        if (incoming) {
          this.vehicleName = incoming;
          this.arrivalAt = time;
        } else {
          this.departureAt = time;
        }
        this.lastArrival = incoming;
      }
      const name = this.vehicleName || '';
      const sinceArrival = time - this.arrivalAt;
      const departure = incoming ? 0 : clamp((time - this.departureAt) / 1.65,0,1);
      const active = name && (incoming || (!this.reduced && departure < 1));
      const slide = this.reduced ? 0 : 410 * (Math.max(0, 1 - sinceArrival / 2.8) ** 2 + departure ** 2);
      const airport = /flieg|flug|plane|air|stratosphaere/.test(name);
      const bus = /bus/.test(name);
      const boat = /faehre|fähre|ferry|ozean/.test(name);
      const metro = /metro|tram|tunnel|u[- ]?bahn|s[- ]?bahn/.test(name);
      if (active && airport) {
        const travel = this.reduced ? .35 : Math.min(1, sinceArrival / 11) + departure * 1.2;
        this.plane(790 - travel * 380, 91 - travel * 29,name === 'stratosphaere');
      }
      if (active && bus) this.coach(142 + slide, 258, 96, 31, 30, 'bus', true);
      if (active && boat) {
        if (name === 'ozean') this.ferry(610 + slide * .28,150 - slide * .085);
        else this.ferry(732 + slide * .34,148 - slide * .11);
      }
      if (active && !airport && !bus && !boat) {
        const experimental = /magnet|versuch|vakuum|zubringer|horizont/.test(name);
        const freight = /fracht|post/.test(name);
        const double = /kontinental|meerbruecke|polarring/.test(name);
        const kind = experimental ? 'magnet' : double ? 'double' : metro ? 'metro' : 'train';
        this.coach(119 + slide, -56, 107, 27, double ? 35 : 27, kind, true);
        if (freight) {
          for (let i = 0; i < 4; i++) this.wagon(232 + slide + i*65,-56,i);
        } else {
          this.coach(232 + slide, -56, 102, 27, double ? 35 : 27, kind, false);
          if (!metro) this.coach(340 + slide, -56, 92, 27, double ? 35 : 27, kind, false);
          if (double) this.coach(437 + slide, -56, 98, 27, 35, kind, false);
        }
      } else {
        this.coach(190, -112, 112, 27, 27, 'train', true);
        this.coach(307, -112, 103, 27, 27, 'train', false);
        this.coach(415, -112, 103, 27, 27, 'train', false);
      }
    }

    coach(u, v, length, breadth, tall, kind, lead) {
      if (u > 615) return;
      const back = v - breadth / 2;
      const near = v + breadth / 2;
      const end = u + length;
      const rail = kind !== 'bus';
      const nose = lead && (kind === 'train' || kind === 'double' || kind === 'magnet') ? (kind === 'magnet' ? 29 : 15) : 5;
      const top = tall + 5;
      const skirt = kind === 'magnet' ? 9 : rail ? 6 : 4;
      this.path([project(u - 4,back),project(end + 4,back),project(end + 6,near + 6),project(u,near + 6)],this.faint);
      if (kind !== 'magnet') {
        for (const offset of [19,length - 20]) {
          const [wheelX,wheelY] = project(u + offset,near - 1,3);
          this.oval(wheelX,wheelY,5.7,5.4,this.ink);
          this.oval(wheelX,wheelY,2,2,this.mid);
        }
      } else {
        this.line(project(u+9,near,4),project(end-3,near,4),this.paper,2.7);
        this.line(project(u+26,near,3),project(end-12,near,3),this.red,1.25);
      }
      this.path([project(u,back + 4,tall - nose / 2),project(u,near - 4,tall - nose / 2),project(u,near - 2,skirt),project(u,back + 2,skirt)],this.glass,this.ink,1.3);
      this.path([project(u,near - 4,tall - nose / 2),project(u + nose,near,tall),project(end,near,tall),project(end,near,skirt),project(u + 3,near,skirt),project(u,near - 2,skirt)],this.paper,this.ink,1.55);
      this.path([project(u,back + 4,tall - nose / 2),project(u + nose,back,top - 2),project(end,back,top - 2),project(end,near,top - 2),project(u + nose,near,top - 2),project(u,near - 4,tall - nose / 2)],this.pale,this.ink,1.18);
      this.line(project(u + nose,near - 3,top - 1),project(end - 2,near - 3,top - 1),this.mid,.8);
      this.line(project(u + 4,near,9),project(end - 1,near,9),this.vehicleStripe,2.1);
      const [x,y] = project(u + nose + 5,near);
      const ctx = this.ctx;
      ctx.save();
      ctx.transform(.91,-.30,0,1,x,y);
      for (let distance = 0; distance < length - nose - 14; distance += 13) {
        ctx.fillStyle = this.ink;
        ctx.fillRect(distance,-tall + 5,9.8,9.5);
        ctx.fillStyle = this.glass;
        ctx.fillRect(distance + 1.2,-tall + 6,6.9,4.7);
        this.line([distance + 1.7,-tall + 10],[distance + 4.7,-tall + 6.3],this.paper,.55);
        if (kind === 'double') {
          ctx.fillStyle = this.ink;
          ctx.fillRect(distance,-tall + 18,9.8,7.2);
          ctx.fillStyle = this.glass;
          ctx.fillRect(distance + 1.2,-tall + 19,6.9,3.6);
        }
      }
      if (kind !== 'train') this.line([29,-tall + 2],[29,-8],this.mid,.95);
      ctx.restore();
      if (lead) {
        this.line(project(u,back + 6,tall - nose / 2 - 4),project(u,near - 5,tall - nose / 2 - 4),this.ink,4.5);
        for (const lamp of [back + 5, near - 5]) {
          const [lightX,lightY] = project(u - .4,lamp,11);
          this.oval(lightX,lightY,2.3,1.65,this.paper,this.ink,.7);
        }
      }
    }

    wagon(u,v,index) {
      if (u > 621) return;
      const dark = index % 3 === 1;
      const near = v + 13;
      const far = v - 13;
      const z = index % 2 ? 28 : 22;
      this.path([project(u-3,far,4),project(u+60,far,4),project(u+60,near,4),project(u-3,near,4)],this.mid,this.ink,1.15);
      for (const offset of [7,49]) {
        const [x,y] = project(u+offset,near-1,3);
        this.oval(x,y,4.7,4.2,this.ink);
      }
      this.path([project(u,far,z),project(u+57,far,z),project(u+57,near,z),project(u,near,z)],this.pale,this.ink,1.15);
      this.path([project(u,near,z),project(u+57,near,z),project(u+57,near,7),project(u,near,7)],dark ? this.glass : this.paper,this.ink,1.2);
      this.path([project(u,far,z),project(u,near,z),project(u,near,7),project(u,far,7)],this.glass,this.ink,1.2);
      for (let offset = 4; offset < 56; offset+=4) this.line(project(u+offset,near,8),project(u+offset,near,z-2),this.faint,.75);
      this.line(project(u+18,near,12),project(u+38,near,12),this.red,2.3);
    }

    plane(x, y, experimental) {
      if (experimental) {
        this.path([[x-80,y+10],[x-18,y-8],[x+21,y-34],[x+64,y-54],[x+42,y-19],[x+79,y-25],[x+84,y-18],
          [x+73,y-8],[x+34,y+2],[x+47,y+11],[x+17,y+24],[x-30,y+16],[x-58,y+17]],this.paper,this.ink,1.42);
        this.path([[x-55,y+8],[x-15,y-6],[x+11,y-8],[x-19,y+2]],this.glass,this.ink,1);
        this.line([x-60,y+13],[x+77,y-14],this.red,1.65);
        this.line([x+85,y-13],[x+147,y-24],this.faint,1);
        this.line([x+84,y-8],[x+155,y-16],this.faint,.7);
        return;
      }
      this.path([[x - 71,y + 8],[x - 59,y + 2],[x - 17,y - 6],[x + 4,y - 39],[x + 17,y - 42],[x + 6,y - 9],
        [x + 51,y - 18],[x + 67,y - 35],[x + 76,y - 36],[x + 74,y - 18],[x + 92,y - 18],[x + 92,y - 12],
        [x + 63,y - 8],[x + 9,y + 3],[x + 39,y + 19],[x + 23,y + 22],[x - 11,y + 8],[x - 49,y + 15],[x - 67,y + 13]],
      this.paper,this.ink,1.35);
      this.line([x - 62,y + 10],[x + 73,y - 15],this.red,1.6);
      for (let i = 0; i < 9; i++) this.oval(x - 44 + i * 9,y + 4 - i * 1.65,1.1,1,this.ink);
      this.line([x + 93,y - 9],[x + 149,y - 17],this.faint,.75);
      this.line([x + 95,y - 5],[x + 165,y - 15],this.faint,.55);
    }

    liner(x,y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x,y);
      this.path([[-93,-13],[-60,-27],[61,-46],[96,-38],[92,-22],[68,-13],[-67,11]],this.ink,this.ink,1.75);
      this.path([[-91,-13],[-61,-18],[75,-42],[96,-38],[68,-29],[-68,-1]],this.red,this.ink,1.15);
      this.path([[-71,-18],[-62,-41],[57,-64],[82,-55],[70,-34],[-65,-7]],this.paper,this.ink,1.4);
      this.path([[-50,-42],[-34,-54],[52,-70],[59,-62],[-56,-31]],this.glass,this.ink,1.15);
      for (const funnel of [-24,8,39]) {
        const bend = -54-funnel*.2;
        this.path([[funnel,bend],[funnel+3,bend-21],[funnel+15,bend-24],[funnel+14,bend-1]],this.red,this.ink,1);
        this.line([funnel+4,bend-20],[funnel+14,bend-22],this.ink,2.1);
      }
      for (const deck of [-32,-23]) for (let i = 0; i < 17; i++) {
        this.line([-55+i*7.2,deck-i*1.42],[-52+i*7.2,deck-i*1.42-.6],this.ink,2.2);
      }
      for (let i = 0; i < 8; i++) this.line([-62+i*21,13-i*3.6],[-50+i*21,12-i*3.6],this.mid,.7);
      ctx.restore();
    }

    ferry(x, y) {
      this.path([[x - 71,y - 1],[x - 47,y + 18],[x + 14,y + 9],[x + 71,y - 12],[x + 69,y - 24],[x + 7,y - 10]],this.ink,this.ink,1.5);
      this.path([[x - 71,y - 1],[x - 30,y - 18],[x + 48,y - 33],[x + 71,y - 23],[x + 14,y - 6],[x - 47,y + 11]],this.pale,this.ink,1.2);
      this.path([[x - 39,y - 10],[x - 35,y - 32],[x + 30,y - 52],[x + 51,y - 44],[x + 50,y - 31],[x + 11,y - 13]],this.paper,this.ink,1.3);
      this.line([x - 36,y - 24],[x + 34,y - 46],this.red,2);
      for (let i = 0; i < 8; i++) this.line([x - 28 + i * 8,y - 18 - i * 2.35],[x - 24 + i * 8,y - 19.1 - i * 2.35],this.ink,3);
      this.line([x + 13,y - 49],[x + 15,y - 66],this.ink,1.4);
      this.path([[x + 15,y - 66],[x + 28,y - 63],[x + 15,y - 59]],this.red,this.ink,.7);
      for (let i = 0; i < 8; i++) this.line([x - 59 + i * 22,y + 24 - i * 4.2],[x - 46 + i * 22,y + 21 - i * 4.2],this.faint,.9);
    }

    crowd(view, time) {
      const people = this.visiblePeople;
      people.length = 0;
      const progress = Math.min(1, this.routeIndex / 21 * .82 + this.prestige / 9 * .18);
      const density = clamp(view.crowd || 0, 0, 1);
      const count = this.simple ? 6 + Math.round(density * 11 + this.detail * 2 + this.routeIndex * 1.4) :
        11 + Math.round(this.detail * 5 + density * (21 + progress * (15 + this.detail * 65)) + progress * (4 + this.detail * 11));
      for (let i = 0; i < count; i++) {
        if (!this.people[i]) {
          const seed = i + 37;
          this.people[i] = { seed, direction: i % 4 === 0 ? -1 : 1, lane: noise(seed * 11),
            start: noise(seed), pace: .013 + noise(seed + 1) * .020, scale: .71 + noise(seed * 2) * .57,
            red: i % 7 === 0, luggage: i % 4 === 0, hat: i % 5 === 0, throughGate: i % 4 === 2,
            lod: noise(seed+251), coat: noise(seed+4) > .38 };
        }
        const walker = this.people[i];
        const walking = fraction(walker.start + time * walker.pace);
        const along = walker.direction < 0 ? 1 - walking : walking;
        const u = -236 + 594 * along;
        const v = walker.throughGate ? 57 + Math.sin(along * circle) * 35 + (walker.lane - .5) * 28 : 22 + walker.lane * 183;
        const x = 354 + u*.91 + v*.80;
        if (x < this.bounds.left - 24 || x > this.bounds.right + 24) continue;
        walker.x = x;
        walker.y = 306 - u * .30 + v * .38;
        walker.red = !this.simple && i % 7 === 0;
        walker.phase = view.reduced ? .1 : time * 7 + i * 1.8;
        people.push(walker);
      }

      if (this.lastSpecial !== view.special) {
        this.lastSpecial = view.special;
        this.specialAt = this.time;
      }
      if (view.special) {
        const troupe = /parade|zug|umzug/.test(String(view.special).toLowerCase()) ? 6 : 3;
        for (let i = 0; i < troupe; i++) {
          const progress = view.reduced ? .45 : .12 + (this.time - this.specialAt) / 14;
          const [x,y] = project(-257 + 675 * progress - 21 * i,164 + i % 2 * 7);
          if (!this.passengers[i]) this.passengers[i] = { seed: 91 + i, scale: 1.22, direction: 1,
            red: true, hat: true, banner: i === 0, lod: 0, luggage: i % 3 === 2 };
          const guest = this.passengers[i];
          guest.x = x;
          guest.y = y;
          guest.phase = time * 10 + i;
          people.push(guest);
        }
      }
      return people.sort((a,b) => a.y - b.y);
    }

    drawWalker(person) {
      if ((person.y > 266 && person.lod < this.detail * .87) || person.banner) {
        this.person(person);
        return;
      }
      const {x,y,scale} = person;
      const step = Math.sin(person.phase) * 2.2 * scale;
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(x,y-6*scale);
      ctx.lineTo(x+step,y);
      ctx.moveTo(x,y-6*scale);
      ctx.lineTo(x-step,y-.4);
      ctx.strokeStyle = this.ink;
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.fillStyle = person.red ? this.red : (person.coat ? this.ink : this.mid);
      ctx.fillRect(x-2.1*scale,y-13.8*scale,4.2*scale,8.2*scale);
      this.oval(x+.3,y-16.5*scale,1.75*scale,1.92*scale,this.paper,this.ink,.75);
    }

    person(person) {
      const { x,y,seed,phase,scale,direction,red,luggage,hat,banner,air = false } = person;
      const ctx = this.ctx;
      if (x < -30 || x > width + 30 || y > height + 28) return;
      const stride = Math.sin(phase) * 3.15;
      const color = red ? this.red : (person.coat ?? (noise(seed + 4) > .38)) ? this.ink : this.mid;
      ctx.save();
      ctx.translate(x,y);
      ctx.scale(scale * direction, scale);
      if (!air) this.oval(2,0,6,1.8,this.faint);
      if (luggage) {
        this.line([-2,-8],[-7,-5],this.ink,.9);
        this.path([[-13,-6],[-7,-6],[-6,-1],[-12,-.2]],this.pale,this.ink,1);
        this.oval(-11,0,1,1,this.ink);
      }
      this.line([1,-6],[1 + stride,0],this.ink,1.55);
      this.line([-1,-6],[-1 - stride,-.35],this.mid,1.35);
      this.path([[-2.3,-14],[1.5,-15],[3.1,-12],[2.4,-6],[-2.1,-6],[-3.4,-11]],color,this.ink,.65);
      this.line([-.7,-12],[air ? 6 : 1 + stride * .6,air ? -18 : -8],this.ink,1.05);
      this.oval(.5,-17.1,2.3,2.55,this.paper,this.ink,.95);
      if (hat) {
        this.line([-2.4,-18.3],[3.7,-18.3],this.ink,1.25);
        this.oval(.4,-19,2.25,1.4,color);
      }
      if (banner) {
        this.line([6,-8],[6,-31],this.ink,1.25);
        this.path([[6,-31],[18,-28],[6,-24]],this.red,this.ink,.7);
      }
      ctx.restore();
    }

    revolver(view) {
      const [x,y] = gate;
      const expansion = clamp(view.wide || 0, 0, 1);
      const radiusX = 73 + expansion * 15;
      const radiusY = 31 + expansion * 6;
      const tall = 87;
      const capY = y - tall;
      const ctx = this.ctx;
      const angle = Number(view.angle) || 0;
      const combo = Number(view.combo) || 0;
      if (view.reduced && combo > (this.lastCombo || 0)) this.stillAngle = Math.round(angle / .6) * .6;
      this.lastCombo = combo;
      const rot = view.reduced ? (this.stillAngle ?? .46) : angle;
      const blades = Math.floor(clamp(view.blade || 0,0,5));
      const count = [4,3,4,5,6,4][blades];
      this.oval(x + 9, y + 7, radiusX + 22, radiusY + 7, this.pale);
      this.oval(x,y + 5,radiusX + 12,radiusY + 5,this.glass,this.ink,1.4);
      this.oval(x,y,radiusX + 12,radiusY + 5,this.paper,this.ink,1.8);
      this.oval(x,y,radiusX + 5,radiusY + 2,this.pale,this.mid,1);
      for (let i = 0; i < 38; i++) {
        const angle = i * circle / 38;
        this.line([x + Math.cos(angle) * (radiusX + 7),y + Math.sin(angle) * (radiusY + 3)],
          [x + Math.cos(angle) * (radiusX + 10),y + Math.sin(angle) * (radiusY + 4)], this.mid,.7);
      }

      ctx.globalAlpha = .24;
      this.path([[x - radiusX,capY],[x - 53,capY - 20],[x,capY - radiusY],[x + 53,capY - 20],[x + radiusX,capY],
        [x + radiusX,y],[x + 53,y - 20],[x,y - radiusY],[x - 53,y - 20],[x - radiusX,y]],this.glass);
      ctx.globalAlpha = 1;
      this.oval(x,y,radiusX,radiusY,null,this.mid,1.1,Math.PI,circle);
      this.oval(x,capY,radiusX,radiusY,null,this.ink,1.15,Math.PI,circle);
      for (const a of [3.62,4.32,5.12,5.83]) {
        const barX = x + Math.cos(a) * radiusX;
        const barY = y + Math.sin(a) * radiusY;
        this.line([barX,barY],[barX,barY - tall],this.mid,1.15);
      }

      const leaves = Array.from({ length: count }, (_, i) => rot + i * circle / count);
      leaves.sort((a,b) => Math.sin(a) - Math.sin(b));
      const blade = a => {
        const dx = Math.cos(a) * (radiusX - 5);
        const dy = Math.sin(a) * (radiusY - 2);
        const outer = [x + dx,y + dy];
        const top = [x + dx,y + dy - tall + 9];
        const inside = [x,y - tall + 9];
        const colored = a === rot;
        const stroke = colored ? this.red : this.ink;
        const panels = [[x,y - 4], inside, top, [outer[0],outer[1] - 4]];
        if (blades === 1 || blades === 2 || blades === 4) {
          const bow = blades === 4 ? 6 : blades === 1 ? 12 : -11;
          panels.splice(2,0,[x + dx * .53 - Math.sin(a) * bow,y + dy * .53 - tall + 9 + (blades === 4 ? -7 : 0)]);
          panels.push([x + dx * .53 - Math.sin(a) * bow,y + dy * .53 - 4]);
        }
        ctx.globalAlpha = colored ? .29 : .55;
        this.path(panels,colored ? this.red : this.glass);
        ctx.globalAlpha = 1;
        this.path(panels,null,stroke,colored ? 2.55 : 1.4);
        this.line([x,y - 24],[outer[0],outer[1] - 24],stroke,blades >= 2 ? 3.7 : 1.3);
        this.line([x + dx * .18,y + dy * .18 - 40],[x + dx * .67,y + dy * .67 - 69],this.paper,1.1);
        if (blades >= 1) this.line([x + dx * .71,y + dy * .71 - 12],[x + dx * .71,y + dy * .71 - tall + 14],stroke,.95);
        if (blades >= 3) this.line([x,y - 63],[outer[0],outer[1] - 63],stroke,1.15);
        if (blades === 5) {
          for (let i = 0; i < 5; i++) {
            const t = .25 + i*.149;
            const xx = x + dx * t;
            const yy = y + dy * t;
            const bow = Math.sin(a) * (7 + i*.8);
            this.path([[xx,yy-13],[xx-bow*.85,yy-23],[xx-bow,yy-43],[xx-bow*.46,yy-65],[xx,yy-73]],null,stroke,1.7,false);
          }
          this.line([x,y-37],[outer[0],outer[1]-37],stroke,2.15);
        }
      };
      leaves.filter(a => Math.sin(a) < 0).forEach(blade);
      this.line([x,y - 2],[x,capY + 1],this.ink,8.3);
      this.line([x - 2,y - 2],[x - 2,capY + 1],this.paper,1.8);
      leaves.filter(a => Math.sin(a) >= 0).forEach(blade);

      for (const side of [-1,1]) {
        const start = side === -1 ? 2.19 : -.83;
        const end = side === -1 ? 3.98 : .87;
        this.oval(x,y,radiusX,radiusY,null,this.ink,3.4,start,end);
        for (const angle of [start,end]) {
          const edgeX = x + Math.cos(angle) * radiusX;
          const edgeY = y + Math.sin(angle) * radiusY;
          this.line([edgeX,edgeY],[edgeX,edgeY - tall],this.ink,3.2);
          this.line([edgeX + side * 1.8,edgeY],[edgeX + side * 1.8,edgeY - tall],this.paper,.65);
        }
      }
      this.oval(x,capY + 4,radiusX + 2,radiusY + 1,null,this.ink,3.1);
      this.oval(x,capY,radiusX + 2,radiusY + 1,null,this.paper,10);
      this.oval(x,capY,radiusX + 7,radiusY + 3,null,this.ink,1.55);
      this.oval(x,capY,radiusX - 3,radiusY - 1,null,this.ink,.95);
      this.oval(x,capY,radiusX + 3,radiusY + 1,null,this.red,2.4,.13,2.98);
      this.line([x + Math.cos(rot) * 55,capY + Math.sin(rot) * 23],[x,capY],this.red,1.25);
      this.oval(x,capY,8.5,4.5,this.ink,this.paper,.9);
      this.oval(x,capY - 1,2.5,2.2,this.red);

      if (this.prestige >= 5 || blades === 5) {
        const marks = blades === 5 ? 16 : this.prestige >= 8 ? 14 : 8;
        this.oval(x,capY-2,radiusX+2,radiusY+1,null,this.mid,1.5);
        for (let i = 0; i < marks; i++) {
          const marker = i*circle/marks;
          const busy = view.autoDispatch && (view.reduced || Math.cos(rot-marker) > .62);
          this.oval(x+Math.cos(marker)*(radiusX+2),capY-2+Math.sin(marker)*(radiusY+1),2.15,1.25,busy ? this.red : this.ink);
        }
      }

      if (view.speed > .62 && !view.reduced) {
        ctx.globalAlpha = (view.speed - .6) * .8;
        this.oval(x,y + 1,radiusX + 15,radiusY + 7,null,this.red,1.75,rot,rot + 1.35);
        this.oval(x,y + 1,radiusX + 15,radiusY + 7,null,this.red,1.1,rot + 2.2,rot + 3.12);
        ctx.globalAlpha = 1;
      }
    }

    drawParticles() {
      if (this.reduced) { this.particles = []; return; }
      this.particles = this.particles.filter(particle => this.time - particle.birth < particle.life);
      for (const particle of this.particles) {
        const age = Math.max(0,this.time - particle.birth);
        const progress = age / particle.life;
        const x = gate[0] + particle.dx * progress;
        const y = gate[1] + particle.dy * progress;
        const lift = particle.lift * progress * (1 - progress);
        this.oval(x,y,4 + lift * .028,1.8,this.faint);
        this.person({ x,y: y - lift, seed: particle.seed, phase: age * 13, direction: particle.dx > 0 ? 1 : -1,
          scale: 1 + lift * .004, red: true, luggage: false, hat: true, air: progress < .95 });
      }
    }
  }

  window.NachtScene = NachtScene;
})();

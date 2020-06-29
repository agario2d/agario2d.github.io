class World{
    constructor(canvas){
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.width = 3000 
        this.height = 3000 
        this.cx = 1500 
        this.cy = 1500 
        this.bgColor = '#111'
        this.gridColor = '#666'
        this.gridSize = 30 
    }
    clear(){
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    resize(w,h){
        this.canvas.width = w
        this.canvas.height = h
    }
    setCenter(x,y){
        this.cx = this.canvas.width/2 - x
        this.cy = this.canvas.height/2 - y
    }
    drawGrid(){
        this.ctx.beginPath();
        for (var i = 0; i <= this.width / this.gridSize; i++) {
            var px = this.cx + this.gridSize * i;
            this.ctx.moveTo(px, this.cy);
            this.ctx.lineTo(px, this.cy+this.height);
        }
        for (var j = 0; j <= this.height / this.gridSize; j++) {
            var py = this.cy + this.gridSize * j;
            this.ctx.moveTo(this.cx, py);
            this.ctx.lineTo(this.cx+this.width, py);
        }
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.stroke();
        this.ctx.closePath();
    }
}

class Ball{
    constructor(min,max){
        this.x = min.x+Math.random()*(max.x-min.x);
        this.y = min.y+Math.random()*(max.y-min.y);
        this.color = this.randomBallColor();
        this.radius = 10; 
        this.speed = 0; 
    }
    randomBallColor(){
        var color = ['red', 'blue', 'white', 'yellow', 'green']
        return color[Math.floor(Math.random()*color.length)]
    }
    drawOn(world){
        var x = this.x + world.cx,
            y = this.y + world.cy
        world.ctx.beginPath();
        world.ctx.arc(x, y, this.radius, 0, Math.PI * 2, true);
        world.ctx.fillStyle = this.color;
        world.ctx.fill();
        world.ctx.closePath();
    }
    offsetTo(Ball){
        return {x:this.x-Ball.x, y:this.y-Ball.y}
    }
    distanceTo(Ball){
        var v = this.offsetTo(Ball)
        return Math.sqrt(v.x*v.x+v.y*v.y);
    }
    eat(Ball){
        this.radius = Math.sqrt(this.radius*this.radius+Ball.radius*Ball.radius)
    }
    limitIn(world){
        this.x = this.x<0?0:this.x>world.width?world.width:this.x;
        this.y = this.y<0?0:this.y>world.height?world.height:this.y;
    }
}
function shapedCurve(x){
    var pn = x<0?-1:1,
        convex = Math.log10(pn*x)/2+1
    return Math.abs(x)<0.01?0:pn*convex
}
var vm = new Vue({
    el:'#agario',
    data(){
        return {
            world: {}, myBall: {}, aiBalls: [], scatterBalls: [],
            minRange: {x:0,y:0}, maxRange: {x:0,y:0}, score: 0,
            drawing: {}, countdown: 90, interval: null, showScore: false, pause: false,
        }
    },
    methods: {
        draw(){
            this.world.clear()
            this.myBall.x+= this.myBall.vector.x
            this.myBall.y+= this.myBall.vector.y
            this.myBall.limitIn(this.world)
            this.world.setCenter(this.myBall.x, this.myBall.y)
            this.world.drawGrid()
            let shouldSort = false
            for (var i = 0; i < this.scatterBalls.length; i++) {
                if (this.scatterBalls[i].distanceTo(this.myBall) < this.myBall.radius) {
                    this.myBall.eat(this.scatterBalls[i])
                    this.scatterBalls.splice(i, 1);
                    this.scatterBalls.push(new Ball(this.minRange, this.maxRange))
                    continue;
                }
                for (var j = 0; j < this.aiBalls.length; j++) {
                    if(this.scatterBalls[i].distanceTo(this.aiBalls[j]) < this.aiBalls[j].radius) {
                        this.aiBalls[j].eat(this.scatterBalls[i])
                        shouldSort = true
                        this.scatterBalls.splice(i, 1);
                        this.scatterBalls.push(new Ball(this.minRange, this.maxRange))
                        continue;
                    }
                }
                this.scatterBalls[i].drawOn(this.world)
            }
            for (var i = 0; i < this.aiBalls.length; i++) {
                if(this.myBall.distanceTo(this.aiBalls[i]) < Math.max(this.myBall.radius,this.aiBalls[i].radius)){
                    if(this.myBall.radius>this.aiBalls[i].radius){ 
                        this.myBall.eat(this.aiBalls[i])
                        this.aiBalls[i] = new Ball(this.minRange, this.maxRange)
                        this.aiBalls[i].radius = Math.random() * 10 + 20;
                        this.aiBalls[i].speed = 1+Math.random()*3 //玩家吃掉的球會越來越快
                        continue;
                    }else if(this.myBall.radius<this.aiBalls[i].radius&&this.myBall.radius>0){ 
                        this.aiBalls[i].eat(this.myBall)
                        shouldSort = true
                        this.score = Math.ceil(this.myBall.radius*this.myBall.radius)-225
                        this.endGame()
                        this.myBall.radius = 0
                    }
                }
                for(var j = i; j < this.aiBalls.length; j++){
                    var inRadius = this.aiBalls[j].distanceTo(this.aiBalls[i]) < this.aiBalls[j].radius,
                        bigger = this.aiBalls[j].radius>this.aiBalls[i].radius
                    if(inRadius && bigger){
                        this.aiBalls[j].eat(this.aiBalls[i])
                        this.aiBalls[i] = new Ball(this.minRange, this.maxRange)
                        this.aiBalls[i].radius = Math.random() * 10 + 20;
                        this.aiBalls[i].speed = 0.5+Math.random()*3
                        shouldSort = true
                        break;
                    } 
                }
                if(this.aiBalls[i].distanceTo(this.myBall)<Math.max(this.world.canvas.width,this.world.canvas.height)){
                    var offset = this.aiBalls[i].offsetTo(this.myBall),
                    pnx = offset.x>0?1:-1,
                    pny = offset.y>0?1:-1,
                    chaseOrEscape = this.aiBalls[i].radius-this.myBall.radius>0?1:-1
                    this.aiBalls[i].x-= this.aiBalls[i].speed*pnx*chaseOrEscape
                    this.aiBalls[i].y-= this.aiBalls[i].speed*pny*chaseOrEscape
                    this.aiBalls[i].limitIn(this.world)
                    this.aiBalls[i].drawOn(this.world)
                }
            }
            if(shouldSort){this.aiBalls.sort((a,b)=>a.radius-b.radius)}
            this.myBall.drawOn(this.world)
            this.drawing = requestAnimationFrame(this.draw);
        },
        setCountdown(){
            this.interval = setInterval(()=>{
                this.countdown-=1
                if(this.countdown==0){
                    clearInterval(this.interval)
                    this.interval = null
                    this.endGame()
                }
            },1000)
        },
        startGame(){
            let newBall = new Ball(this.minRange, this.maxRange)
            this.myBall.x = newBall.x
            this.myBall.y = newBall.y
            this.myBall.radius = 15;
            this.showScore = false
            clearInterval(this.interval)
            this.countdown = 600
            this.setCountdown()
        },
        endGame(){
            this.showScore = true
            this.score = Math.ceil(this.myBall.radius*this.myBall.radius)-225
            clearInterval(this.interval)
        },
        initScene(){
            this.world.clear()
            this.world.drawGrid()
            this.myBall.drawOn(this.world)
            this.aiBalls.forEach(function(ball){ball.drawOn(this.world)})
            this.scatterBalls.forEach(function(ball){ball.drawOn(this.world)})
        }
    },
    mounted(){
        this.world = new World(this.$refs.canvas)
        this.world.resize(window.innerWidth, window.innerHeight)
        this.maxRange = {x:this.world.width,y:this.world.height}
        this.myBall = new Ball(this.minRange, this.maxRange)
        this.myBall.radius = 15
        this.myBall.vector = {x:0,y:0}
        this.myBall.speed = 5 
        for (var k = 0; k < 300; k++) {
            this.scatterBalls.push(new Ball(this.minRange, this.maxRange));
        }
        for (var k = 0; k < 20; k++) {
            var aiBall = new Ball(this.minRange, this.maxRange)
            aiBall.radius = Math.random() * 10 + 20;
            aiBall.speed = Math.random()*3 
            this.aiBalls.push(aiBall)
        }
        let container = this.$refs.agario
        container.addEventListener("mousemove", e=> {
            let rect = container.getBoundingClientRect()
            var vx = (e.clientX-rect.x)/rect.width - 0.5,
                vy = (e.clientY-rect.y)/rect.height - 0.5
            this.myBall.vector.x = this.myBall.speed*shapedCurve(vx)
            this.myBall.vector.y = this.myBall.speed*shapedCurve(vy)
        });
        container.addEventListener("touchmove", e=>{
            let rect = container.getBoundingClientRect()
            var vx = (e.targetTouches[0].pageX-rect.x)/rect.width - 0.5,
                vy = (e.targetTouches[0].pageY-rect.y)/rect.height - 0.5
            this.myBall.vector.x = this.myBall.speed*shapedCurve(vx)
            this.myBall.vector.y = this.myBall.speed*shapedCurve(vy)
        });
        container.addEventListener("mouseover", ()=> {
            if(!this.drawing){
                this.drawing = requestAnimationFrame(this.draw)
            }
            this.pause = false
            if(this.myBall.radius>0&&this.interval==null){
                this.setCountdown()
            }
        });
        container.addEventListener("mouseout", ()=> {
            cancelAnimationFrame(this.drawing);
            this.drawing = null
            clearInterval(this.interval)
            this.interval = null
            this.pause = true
        });
        window.addEventListener("resize", ()=> {
            this.world.resize(window.innerWidth, window.innerHeight)
            this.initScene()
        });
        this.startGame()
        this.drawing = requestAnimationFrame(this.draw);
    },
    beforeDestroy(){
        cancelAnimationFrame(this.drawing)
    }
});
var count_particles, stats, update;
stats = new Stats;
stats.setMode(0);
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild(stats.domElement);
count_particles = document.querySelector('.js-count-particles');
update = function() {
  stats.begin();
  stats.end();
  requestAnimationFrame(update);
};
requestAnimationFrame(update);

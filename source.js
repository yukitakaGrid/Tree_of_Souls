let backgroundGraduationStrong = 100;
let sphereColorList;
let spherePositionList;
let depthRange = 100; //背景の深度
let num_trail = 4;
let num_group_trail = 5;
let cameraPosition;
let sceneMoveStep = -2;
let min_inRangePosition;
let max_inRangePosition;
let trailGenerateInterval = 4;
let treeGenerateInterval = 3;
let emissionOccurInterval = 100;
let emissionTimeStep = 1;
let bornBranchProbability = 0.01;

//wall paramater
let wall_center;
let wall_range;
let min_wall_position;
let max_wall_position

let trailsSystemer;
let treesSystemer;

let mullerFont;

let gradationShader;

let backscene,mainscene;

let vs = `
   // バーテックスシェーダー
    precision mediump float;  // どれくらいの精度で計算するかを定義
    
    attribute vec3 aPosition;       // 頂点の位置
    uniform mat4 uProjectionMatrix; // プロジェクション変換行列(カメラに映る範囲の決定に使う)
    uniform mat4 uModelViewMatrix;  // ビュー変換行列(カメラの視点の決定に使う)
    
    void main() { 
        vec4 positionVec4 = vec4(aPosition, 1.0);  // 位置座標をvec4型にして格納
    
        gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;  // 座標変換を実行(プロジェクション変換行列×ビュー変換行列×頂点座標)
    }
`;

let fs = `
   precision highp float;

  uniform vec2 resolution;

  void main() {
    vec2 uv = (gl_FragCoord.xy - resolution.xy) / min(resolution.x, resolution.y);
    //135,206,250
    //218,112,214
    //x(1-a)+y*a 線形補間
    //色を0~255の空間から0~1の空間に255を割ることで変換する
    float r = (218.0*(1.0-uv.y)+135.0*uv.y)/255.0;
    float g = (112.0*(1.0-uv.y)+206.0*uv.y)/255.0;
    float b = (214.0*(1.0-uv.y)+250.0*uv.y)/255.0;

    gl_FragColor = vec4(r, g, b, 1.0);
}
`;

function preload() {
    mullerFont = loadFont('https://stat.neort.io/externalResource/ci6buukn70rnc8e7s69g.otf');
}

function setup(){
    createCanvas(windowWidth, windowHeight, WEBGL);
    setAttributes('antialias', true);
    frameRate(30);
    backscene = createGraphics(width,height,WEBGL);
    mainscene = createGraphics(width,height,WEBGL);

    cameraPosition = createVector(0,0,0);
    min_inRangePosition = createVector(-4*width,-height,-depthRange);
    max_inRangePosition = createVector(4*width,height,depthRange);

    wall_center = createVector(0,0,-width/5);
    wall_range = createVector(width/2,height,3*width/4);
    min_wall_position = p5.Vector.sub(wall_center,wall_range.copy().div(2));
    max_wall_position = p5.Vector.add(wall_center,wall_range.copy().div(2));
    trailsSystemer = new trailsSystem();
    treesSystemer = new treeSystem()

    textFont(mullerFont);

    gradationShader = createShader(vs,fs);
}

function draw(){
    gradationShader.setUniform('resolution', [width, height]);
    backgroundGraduation();
    camera(0, cameraPosition.y, 650, 0, cameraPosition.y, 0, 0, 1, 0);
    ambientLight(200);
    //cameraの移動に合わせてpointLightも移動
    pointLight(255,255,255,width,-height+cameraPosition.y,300);

    //p5.jsの更新&ドローコール
    drawPhongSpheres(10);
    trailsSystemer.update();
    treesSystemer.update();

    cameraPosition.y += sceneMoveStep;

    //wallにcameraの移動分計算
    wall_center.y += sceneMoveStep;
    min_wall_position.y += sceneMoveStep;
    max_wall_position.y += sceneMoveStep;

    //描画範囲にcameraの移動分計算
    min_inRangePosition.y += sceneMoveStep;
    max_inRangePosition.y += sceneMoveStep;

    //debug用
    //debugWall();
    drawFrameInterval();
}

//draw function

//線形補間で背景をグラデーション
function backgroundGraduation(){
    translate(0,cameraPosition.y,-1000);
    shader(gradationShader);
    noStroke();
    quad(-width*4, -height*4, width*4, -height*4, width*4, height*4, -width*4, height*4);
}

function drawPhongSpheres(num){
    colorMode(HSB,100);
    if(!sphereColorList){
        sphereColorList = new Array(num);
        for(let i=0; i<num; i++){
            sphereColorList[i] = color(random(100),90,100);
        }
    }

    if(!spherePositionList){
        spherePositionList = new Array(num);
        for(let i=0; i<num; i++){
            spherePositionList[i] = createVector(random(-width/2,width/2),random(-height/2,height/2),random(-depthRange,0));
        }
    }

    for(let i=0; i<num; i++){
        //再生成するかどうか判定&再抽選
        let [newPosition, newColor] = replacePhongSpheres(spherePositionList[i], sphereColorList[i]);
        spherePositionList[i] = newPosition;
        sphereColorList[i] = newColor;

        //draw
        push();
        translate(spherePositionList[i].x,spherePositionList[i].y,spherePositionList[i].z);
        noStroke();
        ambientMaterial(sphereColorList[i]);
        specularMaterial(10);
        sphere(40);
        pop();
    }
    colorMode(RGB,255);
}

function replacePhongSpheres(p,c){
    if(max_inRangePosition.y+height/20<p.y){
        //位置の範囲の最小位置から10だけy軸方向に足した場所で球の位置の再生成
        p = createVector(random(-width/2,width/2),min_inRangePosition.y-height/20,random(min_inRangePosition.z,0));
        //カラーの再抽選
        c = color(random(100),random(100),90);

        console.log("球の情報の再抽選を行いました");
    }
    return [p,c];
}

function debugWall(){
    push();
    translate(wall_center.x,wall_center.y,wall_center.z);
    strokeWeight(3);
    stroke(10);
    noFill();
    box(wall_range.x,wall_range.y,wall_range.z);
    pop();
}

class trail{
    constructor(p,v){
        this.position=p;
        this.velocity=v;
        this.acceleration=createVector(0,0,0);
        console.log(this.acceleration);
        this.maxVelocity=2.5;
        this.trailLife=255;
        this.redProperty=238;
        this.greenProperty=130;
        this.blueProperty=238;
        this.isOnEmission=false;
    }

    update(){
        this.velocity.x+=this.acceleration.x;
        this.velocity.z+=this.acceleration.z;
        //x-z方向のみの正規化による制限
        this.limitHorizonVelocity(this.velocity);
        this.position.add(this.velocity);

        this.acceleration.set(0.0,0.0,0.0);
    }

    display(){
        push();
        translate(this.position.x,this.position.y,this.position.z);
        noStroke();
        ambientMaterial(this.redProperty,this.greenProperty,this.blueProperty);
        if(this.isOnEmission)
            emissiveMaterial(this.redProperty,this.greenProperty,this.blueProperty);
        specularMaterial(10);

        //速度方向と頭の角度の同期
        //速度方向と頭の角度の同期
        let dir = this.velocity.copy().normalize();

        // atan2()関数で角度を計算します。注意: atan2()の引数の順番は( y, x )です。
        let yangle = atan2(dir.x,dir.z); 
        let xangle = -asin(dir.y/dir.mag()+Number.EPSILON);

        // rotate関数でオブジェクトを回転します。
        //rotateZ(1.55);
        rotateY(yangle);
        rotateX(xangle);
        box(3,30,8);
        pop();
    }

    limitHorizonVelocity(v){
        let vmag = Math.sqrt(v.x*v.x+v.z*v.z);
        if(vmag>this.maxVelocity){
            v.x=v.x/vmag*this.maxVelocity;
            v.z=v.z/vmag*this.maxVelocity;
        }
        return v
    }

    applyForce(f){
        this.acceleration.add(f);
    }
}

class trailsSystem{
    constructor(){
        //y軸の速度は一定
        this.trails = Array(num_trail * num_group_trail).fill().map(() => new trail(createVector(random(-width/4, width/4), random(-50,50), random(-width/2, 0)),createVector(random(-3,3),sceneMoveStep,random(-3,3))));
        this.trailEmissionIndex = new Array(num_trail * num_group_trail);
        //行の用意
        this.trailQueue = new Array(num_trail * num_group_trail);
        //列の用意
        for(let i=0; i<this.trailQueue.length; i++){
            this.trailQueue[i] = [];
            this.trailEmissionIndex[i] = 0;
        }
        this.separateWeight = 50.0;
        this.alienmentWeight = 0.4;
        this.cohesionWeight = 0.01;
        this.avoidWallWeight = 0.8;
        this.forceRange = 200.0;
    }

    update(){
        for(let gi=0; gi<num_group_trail; gi++){
            for(let i=0; i<num_trail; i++){
                let tmain = this.trails[gi*num_trail+i];
                let alienmentAvarage=createVector(0,0,0);
                let cohesionAverage=createVector(0,0,0);
                let separateAverage=createVector(0,0,0);
                let culcCount = 0;

                for(let j=0; j<num_trail; j++){
                    if(i==j)continue;

                    let tsub = this.trails[gi*num_trail+j];

                    let revForce = p5.Vector.sub(tmain.position,tsub.position);
                    let d = revForce.mag()+Number.EPSILON;

                    if(this.forceRange>Math.abs(d)){
                        //separate
                        separateAverage.add(revForce.div(d*d));

                        //cohesion
                        cohesionAverage.add(tsub.position);

                        //alienment
                        alienmentAvarage.add(tsub.velocity);

                        culcCount++;
                    }
                }
                //cohesion:main to center
                cohesionAverage.div(culcCount+Number.EPSILON);

                let separateForce=p5.Vector.mult(separateAverage, this.separateWeight);
                let cohesionForce;
                if(culcCount!=0)
                    cohesionForce=p5.Vector.mult(p5.Vector.sub(cohesionAverage, tmain.position), this.cohesionWeight);
                let alienmentForce=p5.Vector.mult(p5.Vector.div(alienmentAvarage,culcCount+Number.EPSILON), this.alienmentWeight);

                //力の追加
                tmain.applyForce(separateForce);
                tmain.applyForce(cohesionForce);
                tmain.applyForce(alienmentForce);
                //壁の判定
                this.avoidWall(tmain);
                //位置と速度の更新
                tmain.update();
                //描画処理
                tmain.display();

                let tmainQueue = this.trailQueue[gi*num_trail+i];
                //trailを用意する
                if(frameCount%trailGenerateInterval==0){
                    let p = tmain.position.copy();
                    let v = tmain.velocity.copy();
                    let t = new trail(p,v);
                    //デックの先頭に要素を追加
                    tmainQueue.unshift(t);
                    //先頭の追加に合わせてemissionの位置も移動
                    this.trailEmissionIndex[gi*num_trail+i]++;
                }

                if(frameCount%emissionOccurInterval==0) this.trailEmissionIndex[gi*num_trail+i]=0;
                //trailのemissionのイテレータ
                let tei = this.trailEmissionIndex[gi*num_trail+i];
                if(frameCount%emissionTimeStep==0 && tei<tmainQueue.length){
                    if(tmain.isOnEmission) tmain.isOnEmission=false;
                    else{
                        if(tei==0){
                            tmainQueue[tei].isOnEmission=true;
                            tmainQueue[tmainQueue.length-1].isOnEmission=false;
                        }
                        else{
                            tmainQueue[tei].isOnEmission=true;
                            tmainQueue[tei-1].isOnEmission=false;
                        }
                        this.trailEmissionIndex[gi*num_trail+i]++;

                        if(tei>tmainQueue.length-1){
                        tmain.isOnEmission=true;
                        tmainQueue[tmainQueue.length-1].isOnEmission=false;
                    }
                    }
                }

                //trailを描画する
                for(let ti=0; ti<tmainQueue.length; ti++){
                    let tq = tmainQueue[ti];
                    tq.display();
                    //trailの寿命カウント
                    tq.trailLife-=1.5;
                    //trailの寿命に合わせて色が変わる:238,130,238 to 123,104,238
                    tq.redProperty = map(tq.trailLife,255,0,238,123);
                    tq.greenProperty = map(tq.trailLife,255,0,130,104);
                    tq.blueProperty = map(tq.trailLife,255,0,238,238);
                    if(tq.trailLife<0){
                        //デックの末尾を取り出す
                        this.trailQueue[gi*num_trail+i].splice(tmainQueue.length-1,1);
                    }
                }
            }
        }
    }

    avoidWall(tmain){
        let avoidWallForce;
        let p = tmain.position;
        if(p.x<min_wall_position.x){
            avoidWallForce = createVector(this.avoidWallWeight,0,0);
            tmain.applyForce(avoidWallForce);
        }
        if(max_wall_position.x<p.x){
            avoidWallForce = createVector(-this.avoidWallWeight,0,0);
            tmain.applyForce(avoidWallForce);
        }
        if(p.y<min_wall_position.y){
            avoidWallForce = createVector(0,this.avoidWallWeight,0);
            tmain.applyForce(avoidWallForce);
        }
        if(max_wall_position.y<p.y){
            avoidWallForce = createVector(0,-this.avoidWallWeight,0);
            tmain.applyForce(avoidWallForce);
        }
        if(p.z<min_wall_position.z){
            avoidWallForce = createVector(0,0,this.avoidWallWeight);
            tmain.applyForce(avoidWallForce);
        }
        if(max_wall_position.z<p.z){
            avoidWallForce = createVector(0,0,-this.avoidWallWeight);
            tmain.applyForce(avoidWallForce);
        }
    }
}

class treeElement{
    constructor(p){
        this.position=p;
        this.treeLife=255;
    }

    update(i){
        this.position.x += (1-i)*cos(frameCount*0.1+0.5*i)*4;
        this.position.y += sceneMoveStep;
        this.position.z += (1-i)*sin(frameCount*0.1+0.5*i)*4;
    }

    display(){
        push();
        translate(this.position.x,this.position.y,this.position.z);
        noStroke();
        ambientMaterial(230,230,250);
        specularMaterial(10);
        //ボクセル樹
        box(30);
        pop();
    }
}

class branchElement{
    constructor(p,deg,g){
        this.position=p.copy();
        this.endPositionX=0;
        this.degree=deg;
        this.branchLife=255;
        this.growStep=5;
        this.childBranches = [];
        this.childBranchProbablity=0.012;
        this.growing=true;
        this.growRate=g;
    }

    update(){
        //成長中
        if(this.growing){
            if(random(1)<this.childBranchProbablity && this.growRate>=0){
                console.log("子が生まれました");
                let r = random(-20,20);
                let radian=radians(this.degree);
                let p = createVector(this.position.x+cos(radian)*this.endPositionX,this.position.y+sin(radian)*this.endPositionX,this.position.z);
                let d = this.degree+r;
                let b = new branchElement(p,d,this.growRate);
                this.childBranches.push(b);
                p = createVector(this.position.x+cos(radian)*this.endPositionX,this.position.y+sin(radian)*this.endPositionX,this.position.z);
                d = this.degree-r;
                b = new branchElement(p,d,this.growRate);
                this.childBranches.push(b);
                this.growing=false;
            }
            else if(this.growRate>=0){
                this.endPositionX+=this.growStep;
                this.growRate-=1;
            }
        }
        //子の成長中
        else if(!this.growing){
            this.childBranches[0].update();
            this.childBranches[0].display();

            this.childBranches[1].update();
            this.childBranches[1].display();
        }

        this.branchLife-=0.5;
    }

    display(){
        push();
        translate(this.position.x,this.position.y,this.position.z);

        let radian=radians(this.degree);
        rotateZ(radian);

        //224,255,255
        //221,160,221
        let R = map(this.growRate,255,0,224,221);
        let G = map(this.growRate,255,0,255,160);
        let B = map(this.growRate,255,0,255,221);
        stroke(R,G,B,this.fadeout);
        strokeWeight(5);
        beginShape(LINES);
        vertex(0,0,0);
        vertex(this.endPositionX,0,0);
        endShape();
        pop();
    }
}

class treeSystem{
    constructor(){
        //y軸の速度は一定
        this.trees = new Array(3);
        //行の用意
        this.treeQueue = new Array(3);
        //列の用意
        for(let i=0; i<this.treeQueue.length; i++){
            this.trees[i] = new treeElement(createVector(wall_center.x+100*cos(i*360/this.treeQueue.length)-100, wall_center.y, wall_center.z+100*sin(i*360/this.treeQueue.length)));
            this.treeQueue[i] = [];
        }
        this.branchs = [];
    }

    update(){
        //index:0
        for(let i=0; i<this.trees.length; i++){
            let tmain = this.trees[i];
            let tmainQueue = this.treeQueue[i];
            tmain.update(i);
            //treeを伸ばす
            if(frameCount%treeGenerateInterval==0){
                let p = tmain.position.copy();
                let t = new treeElement(p);
                //デックの先頭に要素を追加
                tmainQueue.unshift(t);
            }
            //treeを描画する
            for(let ti=0; ti<tmainQueue.length; ti++){
                let tq = tmainQueue[ti];
                tq.display();
                tq.treeLife-=0.5;
                //trailの寿命カウント
                if(tq.treeLife<0){
                    //デックの末尾を取り出す
                    tmainQueue.splice(tmainQueue.length-1,1);
                }
            }
            tmain.display();
        }

        //branchのフラクタル生成
        if(random(1)<bornBranchProbability){
            let deg = -90+random(-60,60);
            let p = createVector(wall_center.x,wall_center.y,wall_center.z);
            let b = new branchElement(p,deg,255);
            this.branchs.push(b);
        }

        for(let i=0; i<this.branchs.length; i++){
            this.branchs[i].update();
            this.branchs[i].display();
            if(this.branchs[i].branchLife<0) this.branchs.splice(i,1);
        }
    }
}

function drawFrameInterval(){
    let frameIntervalInSeconds = deltaTime / 1000;
    textSize(50);
    text("Interval: " + frameIntervalInSeconds + " sec", width/10,cameraPosition.y+height/2);
}

function windowResized(){
    resizeCanvas(windowWidth, windowHeight);
    backscene = createGraphics(width,height,WEBGL);
    mainscene = createGraphics(width,height,WEBGL);
}
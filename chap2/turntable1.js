/*----------------------------------------------------
     turntable1.js
 回転盤の中心にオブジェクトを放出したときの運動
----------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var rigid, floor0, table;
var coord = [];//座標軸表示用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;
var dt = 0.02;//数値計算時のタイムステップ
var revolution = 10;//回転盤回転数[rps] 
var radius = 5;//オブジェクトの位置（回転盤中心からの距離）
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var elapseTime2 = 0.0;//アニメスタートからの数値計算タイムステップdtによる経過時間
var speedShoot = 1;
var flagStart = false;
var flagStep = false;
var flagReset = false;
var flagShootStop = false;
var flagShoot = false;
//軌跡点作成
var traceI = [];//慣性座標系のときの軌跡
var traceR = [];//回転座標系のときの軌跡
var maxTrace = 100;//軌跡点個数の最大値
var countTrace;    //軌跡点個数のカウント
var periodTrace = 0.1;//軌跡点を表示する時間間隔
var timeTrace = 0;  //その経過時間
var flagTrace = false;
var flagLinearStop = true;
//観測座標系
var coordNo = 0;//慣性系
var angleT = 0;//回転盤の回転角度
var vObsPos = new Vector3();//回転系2のときの回転盤上の観察者の位置

function webMain() 
{
  // Canvas要素を取得する
  canvas = document.getElementById('WebGL');

  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) 
  {
    alert('WebGLコンテキストの取得に失敗');
    return;
  }

  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  if(!initGlsl(gl, VS_SOURCE, FS_SOURCE))
  {
    alert("GLSL初期化に失敗");
    return;
  }

  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  initCamera();
  initObject();
  readyTexture();
  
  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); 
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;
    elapseTime += frameTime;
    elapseTime1 += frameTime;
    fps ++;
    if(elapseTime1 >= 0.5)
    {
      form1.fps.value = 2*fps.toString(); //1秒間隔で表示
      var timestep = 0.5 / fps;
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;

    if(flagStart)
    {
      elapseTime2 += dt;
      //回転盤の回転
      angleT += table.vOmega.z * dt;
      var qq = mulVQ(table.vOmega, table.q); 
      table.q.add(mulQS(qq, (0.5 * dt)));
      table.q.norm();
      
      
      if(!flagShoot)//発射前
      {
        //円盤上の物体を円盤とともに回転
        rigid.vPos.x = radius * Math.cos(angleT);
        rigid.vPos.y = radius * Math.sin(angleT);
        //同じ角速度で自転
        qq = mulVQ(rigid.vOmega, rigid.q);
        rigid.q.add(mulQS(qq, (0.5 * dt)));
        rigid.q.norm();
      }     
      else//発射後
      { 
        if(!flagShootStop)//shootの瞬間だけ
        {
          //中心に向けて発射した物体の初速度
          rigid.vVel = mul(speedShoot, new Vector3(-rigid.vPos.x, -rigid.vPos.y, 0));
//alert("AAA speed = " + mag(rigid.vVel) + "z = " + rigid.vVel.z );
          var vVelT = new Vector3();
          vVelT = cross(table.vOmega, rigid.vPos);//接線方向速度
          rigid.vVel.add(vVelT);//合成
//alert("BBB speed = " + mag(rigid.vVel) + "z = " + rigid.vVel.z);
          flagShootStop = true;
        }
       
        //並進運動
        var vDir = norm(rigid.vVel);//進行方向単位ベクトル
        //摩擦力
        rigid.vForce.x = - muK * gravity * rigid.mass * vDir.x;
        rigid.vForce.y = - muK * gravity * rigid.mass * vDir.y;
        rigid.vAcc.x = rigid.vForce.x / rigid.mass;
        rigid.vAcc.y = rigid.vForce.y / rigid.mass;
      
        rigid.vVel.x += rigid.vAcc.x * dt; 
        rigid.vVel.y += rigid.vAcc.y * dt; 
        rigid.vPos.x += rigid.vVel.x * dt;
        rigid.vPos.y += rigid.vVel.y * dt;
    
        //-----回転運動-----
        var vDirRot = norm(rigid.vOmega);//オブジェクトの回転軸（慣性空間）
        //減速トルク
        rigid.vTorque.z = - dampRotation * rigid.vSize.x * rigid.mass * muK * vDirRot.z;
        //角速度とトルクをオブジェクト座標系に変換
        var vOmegaObj = qvRotate(conjugate(rigid.q), rigid.vOmega);
        var vTorqueObj = qvRotate(conjugate(rigid.q), rigid.vTorque);
        var cs = cross(vOmegaObj, mulMV(rigid.mInertia, vOmegaObj));
        //角加速度（オブジェクト座標系）
        rigid.vAlpha = mulMV(rigid.mInertiaInverse, sub(vTorqueObj, cs));
        //角加速度を慣性座標系にもどし角速度を更新
        rigid.vOmega.add(qvRotate(rigid.q, mul(rigid.vAlpha, dt)));

        var qq = mulVQ(rigid.vOmega, rigid.q); 
        rigid.q.add(mulQS(qq, (0.5 * dt)));
        rigid.q.norm();
        //----回転運動終了------
        //オブジェクトの運動を止める
        if(mag(rigid.vVel) < 0.1 && mag(rigid.vOmega) < 0.2) 
        { //線形速度および回転速度が小さくなったとき強制的に止める
          rigid.vVel = new Vector3(); 
          rigid.vOmega = new Vector3();
          flagLinearStop = true; 
          flagStart = false;
        }
      }

      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
 //console.log("flagTrace = " + rigid.flagTrace);     
      //軌跡データ作成
      if(timeTrace == 0) 
      {
        traceI[countTrace].copy(rigid.vPos);//慣性系
        traceR[countTrace] = rotZ_rad(rigid.vPos, -angleT);//回転系
        if(!flagLinearStop) countTrace ++;
        if(countTrace >= maxTrace) countTrace = 0;
      }
      timeTrace += dt;
      if(timeTrace >= periodTrace) timeTrace = 0;
      //直線運動と回転運動がどちらも停止
      //if(flagLinearStop && flagRotationStop) flagStart = false;
      display();
    }
  }
  animate();
}
//------------------------------------------------------------------------
function readyTexture() 
{
  var tex = gl.createTexture();// テクスチャオブジェクトを作成する

  var image = new Image();
  image.src = '../imageJPEG/check3.jpg';
  // 画像の読み込み完了時のイベントハンドラを設定する
  image.onload = function(){ setTexture(); }

  function setTexture() 
  {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// 画像のY軸を反転する
    // テクスチャユニット0を有効にする
    gl.activeTexture(gl.TEXTURE0);
    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // テクスチャ画像を設定する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    //シェーダのユニフォーム変数u_samplerにユニット0を渡す
    var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
    gl.uniform1i(samplerLoc, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);    
    display();
  }
}

//--------------------------------------------
function initCamera()
{
  //カメラと光源の初期設定
　//光源インスタンスを作成
  light = new Light();
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist= 20.0; //注視点から視点までの距離(R)
  camera.cnt = [0.0, 0.0, 0.0];//注視点
  camera.theta = 30.0;//仰角（水平面との偏角θ）
  camera.phi = 0.0;  //方位角（φ）
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
}  
  
function initObject()
{
  flagStart = false;

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  muK = parseFloat(form2.muK.value);//動摩擦係数
  speedShoot = parseFloat(form2.speed.value);//放出速度
  //dampRotation =  3.0;//parseFloat(form2.dampRot.value);//回転減速係数

  //オブジェクトの位置，マテリアルを決定する
  rigid = new Rigid();//回転盤上に置く物体
  rigid.kind = "CUBE";
  rigid.vSize = new Vector3(0.5, 0.5, 0.5);
  rigid.vPos = new Vector3( radius, 0.0, rigid.vSize.z / 2);
  rigid.vOmega.z = parseFloat(form2.omega.value) * Math.PI * 2;//[rad/s]
  rigid.mass = 1;
  rigid.calcMomentOfInertia();
  rigid.flagTexture = true;
  vObsPos = new Vector3(radius + 5, 0, 1);//観察者の初期位置
  
  //回転盤
  table = new Rigid();
  table.kind = "CYLINDER";
  table.vSize = new Vector3(radius*2+1, radius*2+1, 0.05);
  table.radiusRatio = 1;
  table.nSlice = 16;
  table.diffuse = [0.0, 0.2, 0.8, 1.0];
  table.ambient = [0.0, 0.1, 0.4, 1.0];
  table.specular = [0.1, 0.1, 0.1, 1.0];
  table.vOmega.z = parseFloat(form2.omega.value) * Math.PI * 2;//[rad/s]

  //軌跡表示用オブジェクト
  trace = new Rigid();
  trace.kind = "SPHERE";
  trace.vPos = new Vector3();//遠方に置く
  trace.vSize = new Vector3(0.2, 0.2, 0.2);
  trace.ambient = [1, 1, 1, 1];
  trace.nSlice = 6;
  trace.nStack = 6;

　for(var i = 0; i < maxTrace; i++) 
  {
    //軌跡位置座標保存用
    traceI[i] = new Vector3(1000,0,0);//慣性系
    traceR[i] = new Vector3(1000,0,0);//回転系
  }
  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(40, 40, 1);
  floor0.nSlice = 20;//x方向分割数
  floor0.nStack = 20;//y方向分割数
  floor0.specular = [0.1, 0.1, 0.1, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;
  
  angleT = 0;
  
  display();
}

//---------------------------------------------
function display()
{ 
  //光源
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  gl.uniform4fv(lightPosLoc, light.pos);
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightColLoc, light.color);
  
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(coordNo == 0)//慣性系
  {
    if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	    vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
    else
  	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);
  }
  else if(coordNo == 1)
  {//回転系1
    vpMatrix.lookAt(0, 0, camera.dist, 0, 0, 0, Math.cos(Math.PI+angleT), Math.sin(Math.PI+angleT), 0.0);
  }  
  else
  {//回転系2
    var p = rotZ_rad(vObsPos, angleT);
    vpMatrix.lookAt(p.x, p.y, p.z, 0, 0, 0, 0, 0, 1);
  }  
  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  //オブジェクトの描画
  var n = rigid.initVertexBuffers(gl);
  rigid.draw(gl, n);
  //回転盤
  n = table.initVertexBuffers(gl);
  table.draw(gl, n);
  
  //軌跡用オブジェクト
  if(flagTrace){
    n = trace.initVertexBuffers(gl);
    for(var i = 0; i < maxTrace; i++) {
      if(coordNo == 0){
        trace.vPos.copy(traceI[i]);
      }
      else {
        trace.vPos = rotZ_rad(traceR[i], angleT);//回転系
      }
      trace.draw(gl, n);
    }
  }
  
  
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影 
  drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    rigid.shadow = shadow_value;
    n = rigid.initVertexBuffers(gl);
    rigid.draw(gl, n);
    rigid.shadow = 0;//影描画後は元に戻す
    gl.disable(gl.BLEND);
    gl.depthMask(true);
  }
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
}

function onClick_dt()
{
  initObject();
}

function onClick_speed()
{
  initObject();
}
function onClick_omega()
{
  initObject();
}

function onClick_muK()
{
  initObject();
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}

function onClickStart()
{
  fps = 0;
  elapseTime = elapseTime0;
  elapseTime = 0;
  elapseTime1 = 0;
  elapseTime2 = 0;
  countTrace = 0;
  timeTrace = 0;
  flagStart = true;
  flagStep = false;
  flagShoot = false;
  flagLinearStop = true;
  angleT = 0;
  lastTime = new Date().getTime();
}
function onClickFreeze()
{
  if(flagStart) { flagStart = false; }
  else { flagStart = true; elapseTime = elapseTime0; }
  flagStep = false;
}
function onClickStep()
{
  flagStep = true;
  flagStart = true;
  elapseTime = elapseTime0;
}
function onClickReset()
{
  elapseTime0 = 0;
  flagStart = false;
  flagStep = false;
  initObject();
  form1.time.value = "0";
  angleT = 0;
  display();
}
function onClickShoot()
{
  flagShoot = true;
  flagShootStop = false;
  flagLinearStop = false;
  countTrace = 0;
  timeTrace = 0;
}

function onClickCameraReset()
{
  initCamera();
  display();
}
function onClickShadow()
{
  shadow_value = parseFloat(form2.shadow.value);
  display();
}


function onClickTrace()
{
  if(form2.trace.checked) rigid.flagTrace = flagTrace = true;
  else                    rigid.flagTrace = flagTrace = false;
  display(); 
}
function onClickPeriod()
{
  periodTrace = parseFloat(form2.period.value);
}
function onChangeCoord()
{
  var radioC =  document.getElementsByName("radioCoord");
  for(var i = 0; i < radioC.length; i++)
  {
     if(radioC[i].checked) coordNo = i;
  }
  initCamera();
  display();
}

/*------------------------------------------------------
    vehicleSM.js
    仮想乗り物
-------------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var sm;//バネ質点モデルのインスタンス
var floor0;
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

//数値計算のタイムステップ
var dt;
var windVel = 0.1;//ｙ方向風速
var windFreq = 1.0;//その振動数
var windGrad = 0.1;//風速の勾配
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
var flagTrack = false;
//軌跡データ用
var flagTrace = false;
var tracePos0 = []; //軌跡配列
var maxTrace = 200; //軌跡点個数の最大値
var numTrace = 0;  //軌跡点の表示個数
var countTrace = 0; //軌跡点個数のカウン ト
var periodTrace = 0.1;//軌跡点を表示する時間間隔
var timeTrace = 0;  //その経過時間

function webMain() 
{
  // Canvas要素を取得する
  canvas = document.getElementById('WebGL');
  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert('WebGLコンテキストの取得に失敗');
    return;
  }
  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  if(!initGlsl(gl, VS_SOURCE, FS_SOURCE)){
    alert("GLSL初期化に失敗");
    return;
  }
  flagQuaternion = false;
  
  sm = new SpringMassVehicle();//バネ質点モデルよる樹木オブジェクト
  springMass = sm;//springMassはswgSupportSM.jsで使用するオブジェクト名
  
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.3, 0.3, 0.4, 1.0);
  gl.enable(gl.DEPTH_TEST);
  
  initCamera();
  initObject();

  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
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
      var t = elapseTime;

   
	  var tt = dt / 10.0;
      for(var j = 0; j < 10; j++)
      {
        if(sm.type == 0)      sm.move0(tt);
        else if(sm.type == 1) sm.move1(tt);
        else                  sm.move2(tt);
      }
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();//経過時間を表示
      
      if(flagStep) { flagStart = false; } 

      //軌跡位置データ作成
      if(timeTrace == 0) {
        tracePos0[countTrace].copy(sm.point[sm.rootNo].vPos);        
        countTrace ++;
        if(countTrace >= numTrace) countTrace = 0;
      }
      timeTrace += dt;
      if(timeTrace >= periodTrace) timeTrace = 0;
      display();
    }
  }
  animate();
}

//--------------------------------------------
function initCamera()
{
  //カメラと光源の初期設定
　//光源インスタンスを作成
  light = new Light();
  light.pos = [10, 5, 20, 1];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 20; 
  camera.theta = 10;
  camera.cnt[2] = 1.5;
  camera.fovy = 20;
  camera.getPos();//カメラ位置を計算
  //カメラの初期位置
  camera0 = new Camera();
  camera0.pos[0] = camera.pos[0];  
  camera0.pos[1] = camera.pos[1];  
  mouseOperation(canvas, camera);//swgSupport.js
}  

//-------------------------------------------------------------------
function initObject()
{
  flagStart = false;
  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  
  sm.numDiv = parseFloat(form2.numDiv.value);
  sm.mass = parseFloat(form2.mass.value);
  sm.length0 = parseFloat(form2.length.value);
  sm.constK = parseFloat(form2.constK.value);//せん断バネと構造バネは同じバネ定数としている
  sm.drctnK = parseFloat(form2.drctnK.value);
  sm.damping = parseFloat(form2.damping.value);
  sm.drag = parseFloat(form2.drag.value);
  sm.speed = parseFloat(form2.speed.value);//スピード
  sm.dir = sm.dir0 = parseFloat(form2.direction.value) * DEG_TO_RAD;//進行方向 
  sm.ang = sm.ang0 = sm.dir;
  sm.vPos = sm.vPos0 = new Vector3(0, 0, sm.radius + sm.length0);
  sm.mode = 0;
  sm.create();  
  
  //軌跡用点表示のためのダミー
  dummy = new Rigid();
  dummy.nSlice = 30;//非表示
  dummy.nStack = 30;
  //軌跡用オブジェクトの位置座標配列
　for(var i = 0; i < maxTrace; i++) {
    tracePos0[i] = new Vector3(1000,0,0);//初期値は遠方
  }

  //フロア
  floor0 = new Rigid();
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(20, 20, 1);
  floor0.nSlice = 20;//x方向分割数(1m/grid)
  floor0.nStack = 20;//y方向分割数
  floor0.col1 = [0.4, 0.3, 0.3, 1.0];
  floor0.col2 = [0.2, 0.2, 0.3, 1.0];
  floor0.specular = [0.1, 0.1, 0.1, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;

  display();
}

//---------------------------------------------
function display()
{ 
  if(flagTrack)
  {
    var moveX = sm.vPos.x - sm.vPos0.x;
    var moveY = sm.vPos.y - sm.vPos0.y;
    camera.pos[0] = camera0.pos[0] + moveX;
    camera.pos[1] = camera0.pos[1] + moveY;
    camera.cnt[0] = sm.point[sm.rootNo].vPos.x;
    camera.cnt[1] = sm.point[sm.rootNo].vPos.y;    
  }
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

  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  var flagPointLoc = gl.getUniformLocation(gl.program, 'u_flagPoint');
  gl.uniform1i(flagPointLoc, false);

  sm.draw(gl);
  if(numTrace > 0)
  {
    var n = dummy.initVertexBuffers(gl);
    //軌跡用オブジェクト
    gl.uniform1i(flagPointLoc, true);
    n = initVertexPoints();
    gl.drawArrays(gl.POINTS, 0, n);
    gl.uniform1i(flagPointLoc, false);
  }
  var n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影 
  if(shadow_value >= 0.01) drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    
    sm.shadow = shadow_value;
    sm.draw(gl);
    sm.shadow = 0;

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

function onChangeData()
{
  initObject();
}

function onChangeSpeed()
{
  sm.speed = parseFloat(form2.speed.value);//歩く速さ
} 
function onChangeDirection()
{
  sm.dir = parseFloat(form2.direction.value)  * DEG_TO_RAD;//進行方向;
} 

function onClickType()
{
  var radio1 = document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) sm.type = i;
  }
  initObject();
}   


function onClickStart()
{
  fps = 0;
  elapseTime = 0.0;
  elapseTime1 = 0.0;
  flagStart = true;
  flagStep = false;
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
  display();
}
function onClickCameraReset()
{
  initCamera();
  display();
}
function onClickTrack()
{
  if(form2.track.checked) flagTrack = true;
  else flagTrack = false;
  display();
}

function onClickShadow()
{
  shadow_value = parseFloat(form2.shadow.value);
  display();
}function onClickPeriodTrace()
{
  periodTrace = parseFloat(form2.periodTrace.value);
}
function onClickNumTrace()
{
  numTrace = parseFloat(form2.numTrace.value);
}

function initVertexPoints() 
{
  //軌跡用オブジェクトを点で描画するときの点座標を作成
  var vertices = [];
  var len = tracePos0.length;
  for(var i = 0; i < len; i++) 
  {
    vertices.push(tracePos0[i].x);
    vertices.push(tracePos0[i].y);
    vertices.push(tracePos0[i].z);
  }

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドにする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  // a_Position変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);

  // a_verte変数でのバッファオブジェクトの割り当てを有効化する
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //Rigidオブジェクトが1個
  return len;
}


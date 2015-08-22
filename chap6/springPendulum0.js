/*------------------------------------------------------
    springPendulum0.js
    1個のバネ振り子振動(強制振動)
-------------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var numRigid = 2;//重り
var rigid = []; 
var numSpring = 1;
var spring = [];
var floor0;
var coord = [];//座標軸表示用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

//数値計算に必要な物理定数,係数,変数
var dt;
var heightFix0 = 2;//固定点の高さ
var omega = 10;//強制信号角周波数
var forceA = 0.1;//強制振動振幅
var gamma = 0;//減衰率
var flagLimit = false;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
var flagDebug = false;

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
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.1, 0.1, 0.2, 1.0);
  gl.enable(gl.DEPTH_TEST);
  initCamera();
  initObject();
  readyTexture();
  
  var maxZ = -10;
  var period = 0, t1 = 0, t2 = 0, freq;
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
      //オイラー法
      //固定点を強制振動
	  var heightFix = heightFix0 + forceA * Math.sin(omega * elapseTime);
	  //バネの変位量
	  var disp = spring[0].len - spring[0].len0;
      //Euler
	  rigid[1].vAcc.z =  -gravity + spring[0].constant * disp / rigid[1].mass - (2*gamma / rigid[1].mass) * rigid[1].vVel.z;
	  rigid[1].vVel.z += rigid[1].vAcc.z * dt;
	  rigid[1].vPos.z += rigid[1].vVel.z * dt;
	  if(flagLimit) {
        if(rigid[1].vPos.z < heightFix - 2.0 * spring[0].len0) rigid[1].vPos.z = heightFix - 2.0 * spring[0].len0;
		if(rigid[1].vPos.z > heightFix - 0.5 * spring[0].len0) rigid[1].vPos.z = heightFix - 0.5 * spring[0].len0;
		if(rigid[1].vPos.z < rigid[1].vSize.z / 2.0) rigid[1].vPos.z = rigid[1].vSize.z / 2.0;//フロア制限
      }

      rigid[0].vPos.z = heightFix + rigid[0].vSize.z / 2.0;
	  spring[0].len = heightFix - rigid[1].vPos.z;
	  spring[0].vPos = new Vector3(0.0, 0.0, heightFix - spring[0].len / 2.0);
			
 	  //周期の計測
 	  if(rigid[1].vVel.z > 0)
 	  {
        if(maxZ < rigid[1].vPos.z){ 
		  maxZ = rigid[1].vPos.z; 
		  t2 = elapseTime;
		  period = t2 - t1;
	    }
	  }
      else
      {  
        maxZ = -10; t1 = t2; 
	    //周期と振動数の表示
　　　  form2.period.value = period.toString();
        freq = 1 / period;
　　　  form2.frequency.value = freq.toString();
      }

      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();//経過時間を表示
      
      if(flagStep) { flagStart = false; } 
      //time += dt;
      display();
    }
  }
  animate();
}
//------------------------------------------------------------------------
function readyTexture() 
{
  //テクスチャオブジェクトを作成する
  var tex = gl.createTexture();   
  
  //Imageオブジェクトを作成する
  var image = new Image();
  image.src = '../imageJPEG/check3.jpg';
  var flagLoaded = false;//画像読み込み終了フラグ
  
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
    //ミップマップ自動生成
    gl.generateMipmap(gl.TEXTURE_2D);
    // テクスチャパラメータを設定する
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    flagLoaded = true;
    //画像の読み込み終了後描画
    if(flagLoaded) display();
  }
}
//--------------------------------------------
function initCamera()
{
  //カメラと光源の初期設定
　//光源インスタンスを作成
  light = new Light();
  light.pos = [10, 5, 20, 1];
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera();
  camera.dist = 5; 
  camera.theta = 10;
  camera.cnt[2] = 0.5;
  camera.getPos();//カメラ位置を計算
  
  mouseOperation(canvas, camera);//swgSupport.js
}  
  
function initObject()
{
  flagStart = false;

  dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  omega = parseFloat(form2.omega.value);//強制信号角振動数
  forceA = parseFloat(form2.forceA.value);//強制信号角振幅
  gamma = parseFloat(form2.gamma.value);
    
  for(var i = 0; i < numRigid; i++) rigid[i] = new Rigid();
  for(var i = 0; i < numSpring; i++) spring[i] = new Rigid();

  rigid[1].mass = parseFloat(form2.mass.value);//移動する重りの質量
  spring[0].len0 = parseFloat(form2.length0.value);
  var disp0 = parseFloat(form2.disp0.value);//初期変位量
  spring[0].constant = parseFloat(form2.springConst.value);
  spring[0].len = spring[0].len0 + disp0 + rigid[1].mass * gravity / spring[0].constant;
  var omega0 = Math.sqrt(spring[0].constant / rigid[1].mass);//固有角振動数
  form2.omega0.value = omega0.toString();
  //オブジェクト0(固定点）
  rigid[0].kind = "CUBE";
  rigid[0].vSize = new Vector3(0.4, 0.4, 0.2);
  rigid[0].vPos = new Vector3(0.0, 0.0, heightFix0);
  rigid[0].flagTexture = false;
  rigid[0].flagDebug = flagDebug;
  rigid[0].diffuse = [0.4, 0.7, 0.9, 1.0];
  rigid[0].ambient = [0.2, 0.3, 0.4, 1.0];
  //オブジェクト1(振り子の重り）
  rigid[1].kind = "SPHERE";
  rigid[1].vSize = new  Vector3(0.3, 0.3, 0.3) ;
  rigid[1].vPos = new Vector3(0, 0, heightFix0 - spring[0].len);
  rigid[1].flagTexture = true;
  rigid[1].flagDebug = flagDebug;
  //バネ
  spring[0].kind = "SPRING";
  spring[0].vPos = new Vector3(0.0, 0.0, heightFix0 - spring[0].len/2);
  spring[0].diffuse = [0.8, 0.8, 0.4, 1.0];
  spring[0].ambient = [0.4, 0.4, 0.2, 1.0];
  spring[0].vEuler = new Vector3(0, 0, 0);
  spring[0].radius = 0.08;//主半径(Springのサイズはradiusとlenだけで指定、vSizeを使用しない）
  spring[0].radiusRatio = 0.25;
  spring[0].nSlice = 8;
  spring[0].nStack = 8; 
  spring[0].nPitch = 10;

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

  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  var n;
  for(var k = 0; k < numRigid; k++)
  {
    if(k == 1) {
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(samplerLoc, 0);
    }
    //オブジェクトの描画
    n = rigid[k].initVertexBuffers(gl);
    rigid[k].draw(gl, n);
  }
  for(var k = 0; k < numSpring; k++)
  {
    n = spring[k].initVertexBuffers(gl);
    spring[k].draw(gl, n);
  }


  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影 
  if(shadow_value >= 0.1) drawShadow();    

  function drawShadow()
  {
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    for(var k = 0; k < numRigid; k++)
    {
      rigid[k].shadow = shadow_value;
      n = rigid[k].initVertexBuffers(gl);
      rigid[k].draw(gl, n);
      rigid[k].shadow = 0;//影描画後は元に戻す
    }
    for(var k = 0; k < numSpring; k++)
    {
      spring[k].shadow = shadow_value;
      n = spring[k].initVertexBuffers(gl); 
      spring[k].draw(gl, n);
      spring[k].shadow = 0;//影描画後は元に戻す
    }

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

function onClick_method()
{
  var radio1 =  document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) n_method = i;
  }
  initObject();
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}

function onClickDebug()
{
  if(form2.debug.checked) flagDebug = true;
  else                    flagDebug = false;
  
  rigid[0].flagDebug = flagDebug;
  rigid[1].flagDebug = flagDebug;
  spring[0].flagDebug = flagDebug;
  display();
}

function onClickStart()
{
  fps = 0;
  time = 0.0;
  elapseTime = 0.0;
  elapseTime1 = 0.0;
  countTrace = 0;
  timeTrace = 0;
  count = 0;
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

function onClickShadow()
{
  shadow_value = parseFloat(form1.shadow.value);
  display();
}

function onClickLimit()
{
  if(flagLimit) flagLimit = false;
  else          flagLimit = true;
}


/*------------------------------------------------------
    coupledPendula1.js
    支持棒が剛体の連成振り子
    yz平面内で振動
-------------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var numRigid = 5;//重りと支持棒
var rigid = []; 
var numSpring = 1;
var spring = [];
var floor0;
var coord = [];//座標軸表示用
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.2;

var dt;
var heightFix = 2;//固定点の高さ
var theta1, theta2, theta01, theta02;//振れ角
var vPos1, vPos2;
var vVel1, vVel2;
var flagLimit = true;
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
//軌跡データ用
var tracePos0 = []; //軌跡配列
var tracePos1 = []; //軌跡配列
var maxTrace = 100; //軌跡点個数の最大値
var numTrace = 50;  //軌跡点の表示個数
var countTrace = 0; //軌跡点個数のカウン ト
var periodTrace = 0.05;//軌跡点を表示する時間間隔
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
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.1, 0.1, 0.2, 1.0);
  gl.enable(gl.DEPTH_TEST);
  initCamera();
  initObject();
  readyTexture();
  
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
      var vG = new Vector3(0.0, 0.0, -gravity);//重力ベクトル
      //オイラー法
      tt = dt / 1000.0;
	  for(var i = 0; i < 1000; i++)
      {
        var y1 = vPos1.y - vPosFix1.y;//+ len0/2;
        var h1 = heightFix - vPos1.z;
        var y2 = vPos2.y - vPosFix2.y;//len0/2;		
        var h2 = heightFix - vPos2.z;
        theta1 = Math.atan2(y1, h1);
        theta2 = Math.atan2(y2, h2);
        var omega1 = (theta1 - theta01) / tt;
        var omega2 = (theta2 - theta02) / tt;
		var cc1 = Math.cos(theta1);
		var cc2 = Math.cos(theta2);
		//棒の単位ベクトル（重りから支点方向）
		var vDir1 = direction(vPos1 , vPosFix1);
		var vDir2 = direction(vPos2 , vPosFix2);
		//張力
		var vTension1 = mul(length1 * omega1 * omega1 + gravity * cc1, vDir1);//mass1は除いてある
		var vTension2 = mul(length2 * omega2 * omega2 + gravity * cc2, vDir2);//mass2は除いてある
			
		len = distance(vPos1, vPos2);//バネの長さ
		
        var vDir0 = direction(vPos1 , vPos2);//バネの単位ベクトル
		disp = len - len0; //バネの変位
		vTension1.add(vG);
		var vAcc1 = add(vTension1 , mul(constK*disp/mass1, vDir0));
		vTension2.add(vG);
		var vAcc2 = sub(vTension2 , mul(constK*disp/mass2, vDir0));

        vVel1.add(mul(vAcc1, tt));
        vVel2.add(mul(vAcc2, tt));
        vPos1.add(mul(vVel1, tt));
        vPos2.add(mul(vVel2, tt));

        theta01 = theta1;
        theta02 = theta2;
        
        y1 = vPos1.y + len0/2;
        h1 = heightFix - vPos1.z;
        y2 = vPos2.y - len0/2;		
        h2 = heightFix - vPos2.z;
		var cc1 = h1 / Math.sqrt(h1*h1 + y1*y1);
		var cc2 = h2 / Math.sqrt(h2*h2 + y2*y2)

        //固定点が移動しないようにｚ座標を振れ角から求める
        vPos1.z = heightFix - length1 * cc1;
        vPos2.z = heightFix - length2 * cc2;
        
		len = distance(vPos1, vPos2);//バネの長さ
        vDir0 = direction(vPos1 , vPos2);//バネの単位ベクトル
        var vPos0 = div(add(vPos1, vPos2), 2);//バネの中心
        if(flagLimit) {
       	  if(len < 0.5 * len0) len = 0.5 * len0;
	      if(len > 2.0 * len0) len = 2.0 * len0;
	      //重り位置の修正
		  vPos1 = add(vPos0, mul(vDir0, -len/2));
          vVos2 = add(vPos0, mul(vDir0,  len/2));  		
		}
      }
      //おもり
      rigid[1].vPos = vPos1;
      rigid[1].vEuler.x = theta1 * RAD_TO_DEG;
      rigid[2].vPos = vPos2;
      rigid[2].vEuler.x = theta2 * RAD_TO_DEG;
	  //支持棒
	  rigid[3].vPos = div(add(vPos1, vPosFix1), 2);
	  rigid[3].vEuler = rigid[1].vEuler;
	  rigid[4].vPos = div(add(vPos2, vPosFix2), 2);
	  rigid[4].vEuler = rigid[2].vEuler;
	  spring[0].len = len;
	  spring[0].vPos = vPos0;//div(add(vPos1, vPos2), 2);
	  spring[0].vEuler = getEulerZ(vPos1, vPos2);

      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();//経過時間を表示
      
      if(flagStep) { flagStart = false; } 
      
      //軌跡位置データ作成
      if(timeTrace == 0) {
        tracePos0[countTrace].copy(rigid[1].vPos);        
        tracePos1[countTrace].copy(rigid[2].vPos);        
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

//------------------------------------------------------------------------
function readyTexture() 
{
  //テクスチャオブジェクトを作成する
  var tex = [];
  tex[0] = gl.createTexture();   
  tex[1] = gl.createTexture(); 
  
  //Imageオブジェクトを作成する
  var image = [];
  for(var i = 0; i < numRigid; i++) image[i] = new Image();
  image[0].src = '../imageJPEG/check3.jpg';
  image[1].src = '../imageJPEG/check4.jpg';
  var flagLoaded = [];//画像読み込み終了フラグ
  flagLoaded[0] = false;
  flagLoaded[1] = false;
  
  // 画像の読み込み完了時のイベントハンドラを設定する
  image[0].onload = function(){ setTexture(0); }
  image[1].onload = function(){ setTexture(1); }

  function setTexture(no) 
  {
    // テクスチャユニット0を有効にする
    if(no == 0) gl.activeTexture(gl.TEXTURE0);
    else gl.activeTexture(gl.TEXTURE1);
    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_2D, tex[no]);
    // テクスチャ画像を設定する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image[no]);
    //ミップマップ自動生成
    gl.generateMipmap(gl.TEXTURE_2D);
    // テクスチャパラメータを設定する
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    flagLoaded[no] = true;
    //2つの画像の読み込み終了後描画
    if(flagLoaded[0] && flagLoaded[1]) display();
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
  var thetaDeg1 = parseFloat(form2.theta1.value);
  var thetaDeg2 = parseFloat(form2.theta2.value);
  theta01 = theta1 = thetaDeg1 * DEG_TO_RAD;//springの振れ角(rad)
  theta02 = theta2 = thetaDeg2 * DEG_TO_RAD;//springの振れ角(rad)
  
  length1 = length2 = 1.5;//支持棒の長さ(固定）
  mass1 = parseFloat(form2.mass1.value);//移動する重りの質量
  mass2 = parseFloat(form2.mass2.value);//移動する重りの質量

  constK = parseFloat(form2.springConst.value);
  //重りの初期y座標
  var y10 = length1 * Math.sin(theta1);
　var y20 = length2 * Math.sin(theta2);
  //初期のおもりの高さ
  var height1 = heightFix - length1 * Math.cos(theta1);
  var height2 = heightFix - length2 * Math.cos(theta2);
  len0 = parseFloat(form2.length0.value);//バネ自然長
  //位置
  vPos1 = new Vector3(0.0, -len0 / 2.0 + y10, height1);
  vPos2 = new Vector3(0.0,  len0 / 2.0 + y20, height2);
  len = distance(vPos1, vPos2);//バネの長さ
  vVel1 = new Vector3(0, 0, 0);
  vVel2 = new Vector3(0, 0, 0.0);
  //固定点
  vPosFix1 = new Vector3(0.0, -len0 / 2.0, heightFix);
  vPosFix2 = new Vector3(0.0,  len0 / 2.0, heightFix);
  
  for(var i = 0; i < numRigid; i++) rigid[i] = new Rigid();
  for(var i = 0; i < numSpring; i++) spring[i] = new Rigid();
    
  //オブジェクト0(固定点）
  rigid[0].kind = "CUBE";
  rigid[0].vSize = new Vector3(0.3, 2.5, 0.1);
  rigid[0].vPos = new Vector3(0.0, 0.0, heightFix);
  rigid[0].flagTexture = false;
  rigid[0].flagDebug = flagDebug;
  rigid[0].diffuse = [0.4, 0.6, 0.8, 1.0];
  rigid[0].ambient = [0.2, 0.3, 0.4, 1.0];
  //オブジェクト1(重り1）
  rigid[1].kind = "SPHERE";
  rigid[1].vSize = new  Vector3(0.25, 0.25, 0.25) ;
  rigid[1].vPos = vPos1;
  rigid[1].vEuler = new Vector3(thetaDeg1, 0, 0);
  rigid[1].flagTexture = true;
  rigid[1].flagDebug = flagDebug;
  //オブジェクト2(重り2）
  rigid[2].kind = "SPHERE";
  rigid[2].vSize = new  Vector3(0.25, 0.25, 0.25) ;
  rigid[2].vPos = vPos2;
  rigid[2].vEuler = new Vector3(thetaDeg2, 0, 0);
  rigid[2].flagTexture = true;
  rigid[2].flagDebug = flagDebug;
   //オブジェクト3(支持棒1）
  rigid[3].kind = "CYLINDER";
  rigid[3].vSize = new  Vector3(0.05, 0.05, length1) ;
  rigid[3].vPos = div(add(vPosFix1, vPos1), 2);
  rigid[3].vEuler = new Vector3(thetaDeg1, 0, 0);
  rigid[3].nSlice = 8;
  rigid[3].radiusRatio = 1.0;
  rigid[3].flagTexture = false;
  rigid[3].flagDebug = flagDebug;
  rigid[3].diffuse = [0.4, 0.8, 0.4, 1.0];
  rigid[3].ambient = [0.2, 0.4, 0.2, 1.0];
   //オブジェクト3(支持棒1）
  rigid[4].kind = "CYLINDER";
  rigid[4].vSize = new  Vector3(0.05, 0.05, length2) ;
  rigid[4].vPos = div(add(vPosFix2, vPos2), 2);
  rigid[4].vEuler = new Vector3(thetaDeg2, 0, 0);
  rigid[4].nSlice = 8;
  rigid[4].radiusRatio = 1.0;
  rigid[4].flagTexture = false;
  rigid[4].flagDebug = flagDebug;
  rigid[4].diffuse = [0.4, 0.8, 0.4, 1.0];
  rigid[4].ambient = [0.2, 0.4, 0.2, 1.0];

//alert(" v = " + rigid[1].vVel.z + " z = " + rigid[1].vPos.z);
  //バネ
  spring[0].kind = "SPRING";
  spring[0].vPos = div(add(vPos1, vPos2), 2);
  spring[0].vEuler = getEulerZ(vPos1, vPos2);
  spring[0].len = len;
  spring[0].diffuse = [0.8, 0.8, 0.4, 1.0];
  spring[0].ambient = [0.4, 0.4, 0.2, 1.0];
  spring[0].radius = 0.08;//主半径(Springのサイズはradiusとlenだけで指定、vSizeを使用しない）
  spring[0].radiusRatio = 0.25;
  spring[0].nSlice = 8;
  spring[0].nStack = 8; 
  spring[0].nPitch = 10;

  //軌跡用点表示のためのダミー
  dummy = new Rigid();
  dummy.nSlice = 30;//非表示
  dummy.nStack = 30;
  //軌跡用オブジェクトの位置座標配列
　for(var i = 0; i < maxTrace; i++) {
    tracePos0[i] = new Vector3(1000,0,0);//初期値は遠方
    tracePos1[i] = new Vector3(1000,0,0);//初期値は遠方
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
  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  var n;
  for(var k = 0; k < numRigid; k++)
  {
    if(k == 1) {
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(samplerLoc, 0);
    }
    else if(k == 2)
    {
      gl.activeTexture(gl.TEXTURE1);
      gl.uniform1i(samplerLoc, 1);
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

  var n = dummy.initVertexBuffers(gl);
  //軌跡用オブジェクト
  gl.uniform1i(flagPointLoc, true);
  n = initVertexPoints();
  gl.drawArrays(gl.POINTS, 0, n);
  gl.uniform1i(flagPointLoc, false);

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
  shadow_value = parseFloat(form2.shadow.value);
  display();
}

function onClickLimit()
{
  if(flagLimit) flagLimit = false;
  else          flagLimit = true;
}

function onClickLimit()
{
  if(flagLimit) flagLimit = false;
  else          flagLimit = true;
}
function onClickPeriodTrace()
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
    vertices.push(0);//オブジェクト番号
    vertices.push(tracePos1[i].x);
    vertices.push(tracePos1[i].y);
    vertices.push(tracePos1[i].z);
    vertices.push(1);
  }

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドにする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  // a_Position変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 4, gl.FLOAT, false, 0, 0);

  // a_verte変数でのバッファオブジェクトの割り当てを有効化する
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //Rigidオブジェクトが2個
  return 2*len;
}


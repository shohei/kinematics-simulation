/*-------------------------------------------
     projectile2D1.js
     2次元放物運動1
--------------------------------------------*/
var canvas; //キャンバス要素
var ctx;//コンテキスト
var factor = 5;//表示倍率(1[m]のピクセル数
var X0, Y0;//表示座標原点（canvas座標）
var resistanceNo = 0;
//物理定数
var gravity = 9.8;//重力加速度[m/s^2] 

function main() 
{
  //canvas要素を取得する
  canvas = document.getElementById('myCanvas');
  
  //描画コンテキストを取得
  ctx = canvas.getContext("2d");

  drawCoordinates();
}
  
function drawCoordinates()
{
  //キャンバスを白でクリア
  clearCanvas("white");
  //表示座標原点
  var w0 = 50;
  X0 = w0;
  Y0 = canvas.height - w0 + 20;
  //座標軸の表示
  //x軸
  drawLine(X0, Y0, canvas.width -20, Y0, "rgb(100, 100, 255)", 1);
  //y軸
  drawLine(X0, Y0, X0, 80, "rgb(100, 100, 255)", 1);
  //x軸目盛
  drawLine(X0 + 50 * factor, Y0, X0 + 50 * factor,  Y0 - 30,  "rgb(100, 100, 255)", 1);
  drawLine(X0 + 100 * factor, Y0, X0 + 100 * factor,  Y0 - 40,  "rgb(100, 100, 255)", 1);
  drawText("0", X0 -10, Y0 + 20, "black", 2, 2);
  drawText("50", X0 + 50 * factor -10, Y0 + 20, "black", 2, 2);
  drawText("100", X0 + 100 * factor - 10 , Y0 + 20, "black", 2, 2);
  //y軸目盛
  drawLine(X0, Y0 - 50 * factor, X0 + 30,  Y0 - 50 * factor,  "rgb(100, 100, 255)", 1);
  drawText("50", X0 - 30, Y0 - 50 * factor + 10, "black", 2, 2);
  
  //凡例
  drawLine(80, 20, 110, 20, "black", 1);
  drawText("解析解", 115, 25, "black", 2, 2);
  drawLine(200, 20, 230, 20, "red", 1);
  drawText("前進オイラー", 235, 25, "black", 2, 2);
  drawLine(370, 20, 400, 20, "blue", 1);
  drawText("後退オイラー", 405, 25, "black", 2, 2);
  drawLine(540, 20, 570, 20, "green", 1);
  drawText("改良オイラー", 575, 25, "black", 2, 2);
  drawLine(80, 50, 110, 50, "magenta", 1);
  drawText("かえる跳び", 115, 55, "black", 2, 2);
}

function onClickStart()
{
//alert("no = " + resistanceNo);
  if(resistanceNo == 0) nonResistance();
  else if(resistanceNo == 1) viscous(); 
  else if(resistanceNo == 2) inertia(); 
}

function nonResistance()
{
  //無抵抗
  var dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  var speed0 = parseFloat(form1.speed0.value);//初速度[m/s]
  var angle0 = parseFloat(form1.angle0.value);//放射角度[deg]
  var Hmax, Lmax, Tmax; 
　
  var vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
  var vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
  //無抵抗のときの最高点さ、最長到達距離、到達時間
  Hmax = 0.5 * vy * vy / gravity;
  Lmax = speed0 * speed0 * Math.sin(2.0 * angle0 * Math.PI / 180.0) / gravity;
  Tmax = 2.0 * speed0 * Math.sin(angle0 * Math.PI / 180.0) / gravity;
  form1.Hmax.value = Hmax; 
  form1.Lmax.value = Lmax; 
  form1.Tmax.value = Tmax; 
    
  if(form1.m_analysis.checked) analysisSolution();
  if(form1.m_for.checked) forwardEuler();
  if(form1.m_back.checked) backwardEuler();
  if(form1.m_improved.checked) improvedEuler();
  if(form1.m_frog.checked) leap_frog();

  function analysisSolution()
  {//解析解
    var data = [];
    var x, y, time;
    //初期値
    x = 0; y = 0; time = 0;
    data.push([X0 + x * factor, Y0 - y * factor]);//始点のデータ    
    while(time < Tmax + 0.1)
    {
    　time += 0.01;//解析解の時はdt=0.01[s]で計算
      x = vx * time;
      y = vy * time - 0.5 * gravity * time * time;
      data.push([X0 + x * factor, Y0 - y * factor]);//始点のデータ    
    }
    drawLines(data, "black", 1); 
  }

  function forwardEuler()
  {
    //前進オイラー法
    var data = [];
    var x, y, vx, vy, ax, ay;
    time = 0.0;
    
    //初期値
    x = 0.0; y = 0.0; ax = 0.0; ay = -gravity;
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
  
    data.push([X0 + x * factor, Y0 - y * factor]);//始点のデータ 
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "red", 1); 
    while(y > -1.0)
    {
　    x += vx * dt; y += vy * dt;
      vx += ax * dt;//ax=0なので省略してもよい
      vy += ay * dt;
      data.push([X0 + x * factor, Y0 - y * factor]);
    }
    drawLines(data, "red", 1);
  }

  function backwardEuler()
  {
    //後退オイラー法
    var data = [];
    var x, y, vx, vy, ax, ay;
    //初期値
    x = 0.0; y = 0.0; ax = 0.0; ay = -gravity;
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
    data.push([X0 + x * factor, Y0 - y * factor]);//始点のデータ    
    while(y > -1.0)
    {
      vx += ax * dt;//ax=0なので省略してもよい
      vy += ay * dt;
      x += vx * dt; y += vy * dt;
      data.push([X0 + x * factor, Y0 - y * factor]);
    }
    drawLines(data, "blue", 1);
  }
  
  function improvedEuler()
  {
    //改良オイラー法
    var data = [];
    var x, y, vx, vy, ax, ay;
    var vx1, vy1, ax1, ay1;
    //初期値
    x = 0.0; y = 0.0; ax = 0.0; ay = -gravity; ax1 = ax; ay1 = ay;
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
    
    data.push([X0 + x * factor, Y0 - y * factor]);//始点のデータ    

    while(y > -1.0)
    {
      vx1 = vx; vy1 = vy + ay * dt;

      x += 0.5 * (vx + vx1) * dt; 
      y += 0.5 * (vy + vy1) * dt;
      vx += 0.5 * (ax + ax1) * dt;
      vy += 0.5 * (ay + ay1) * dt;
      data.push([X0 + x * factor, Y0 - y * factor]);
    }
    drawLines(data, "green", 1);
  }

  function leap_frog()
  {
    //かえる跳び法
    var data = [];
    var x, y, vx, vy, ax, ay;
    //初期値
    x = 0.0; y = 0.0; ax = 0.0; ay = -gravity;
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
    data.push([X0 + x * factor, Y0 - y * factor]);//始点のデータ    
    //最初のかえる跳び
    vx += ax * dt / 2; vy += ay * dt / 2;
    x += vx * dt; y += vy * dt;
    data.push([X0 + x * factor, Y0 - y * factor]);//dt後の位置    

    while(y > -1.0)
    {
      vx += ax * dt; vy += ay * dt;
      x += vx * dt; y += vy * dt;
      data.push([X0 + x * factor, Y0 - y * factor]);
    }
    drawLines(data, "magenta", 1);
  }
}

function viscous()
{
  //粘性抵抗があるときの解析解と数値解法
  var dt = parseFloat(form1.dt.value);//タイムステップ[s]
  var speed0 = parseFloat(form1.speed0.value);//初速度[m/s]
  var angle0 = parseFloat(form1.angle0.value);//放射角度[deg]

  var dia = parseFloat(form1.dia.value);
  var mass = parseFloat(form1.mass.value);
  //20°Cの空気に対する粘度[Pa/s]
  var eta = parseFloat('1.8e-5');// * 0.00001;
  //粘性抵抗係数
  var Cv = 3.0 * Math.PI * eta * dia;//Stokes law
  var gammaV = Cv / mass;
  
　//初速度
  var vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
  var vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸

  if(form1.m_analysis.checked) analysisSolution();
  if(form1.m_for.checked) forwardEuler();
  if(form1.m_back.checked) backwardEuler();
  if(form1.m_improved.checked) improvedEuler();
  if(form1.m_frog.checked) leap_frog();

  function analysisSolution()
  {
    var data = [];
    var x, y, time;
    //初期値
    x = 0; y = 0; time = 0;
    data.push([X0 + x * factor, Y0 - y * factor]);//始点のデータ    
    while(y > -1)
    {
    　time += 0.01;//解析解の時はdt=0.01[s]で計算
      var aa = (1.0 - Math.exp(-gammaV * time)) / gammaV;
      x = vx * aa;
      y = -gravity * time / gammaV + (vy + gravity / gammaV) * aa;
      data.push([X0 + x * factor, Y0 - y * factor]);//始点のデータ    
    }
    drawLines(data, "black", 1); 
  }

  function forwardEuler()
  {
    //前進オイラー法
    var x, y, vx, vy, ax, ay;
    time = 0.0;
    
    //初期値
    x = 0.0; y = 0.0; 
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
  
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "red", 1); 
    while(y > -1.0)
    {
　    x += vx * dt; 
      y += vy * dt;
      ax = -gammaV * vx;
      ay = - (gravity + gammaV * vy);
      vx += ax * dt;
      vy += ay * dt;
      drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "red", 1); 
    }   
  }

  function backwardEuler()
  {
    //後退オイラー法
    var x, y, vx, vy, ax, ay;
    time = 0.0;
    //初期値
    x = 0.0; y = 0.0; 
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "blue", 1); 
    while(y > -1.0)
    {
      ax = -gammaV * vx;
      ay= - (gravity + gammaV * vy);
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt; y += vy * dt;
      drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "blue", 1); 
    }
  }

  function improvedEuler()
  {
    //改良オイラー法
    var x, y, vx, vy, ax, ay, vx1, vy1, ax1, ay1;
    //初期値
    x = 0.0; y = 0.0;// ax = 0.0; ay = -gravity; ax1 = ax; ay1 = ay;
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
    ax = -gammaV * vx; 
    ay = -(gravity + gammaV * vy);
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "green", 1); 
    while(y > -1.0)
    { 
      vx1 = vx + ax * dt;
      vy1 = vy + ay * dt;
      //位置の更新
      x += 0.5 * (vx + vx1) * dt;
      y += 0.5 * (vy + vy1) * dt;
      //加速度の更新
      ax1 = -gammaV * vx1; 
      ay1 = -(gravity + gammaV * vy1);
      //速度の更新
      vx += 0.5 * (ax + ax1) * dt;
      vy += 0.5 * (ay + ay1) * dt;
      ax = ax1; ay = ay1;//ax1, ay1を次の時刻の加速度にする
      drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "green", 1); 
    }
  }

  function leap_frog()
  {
    //かえる跳び法
    var x, y, vx, vy, ax, ay;
    
    //初期値
    x = 0.0; y = 0.0; ax = 0.0; ay = -gravity;
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "red", 1); 
    //最初のかえる跳び
    ax = -gammaV * vx; ay = -(gravity + gammaV * vy);
    vx += ax * dt / 2; vy += ay * dt / 2;
    x += vx * dt; y += vy * dt;
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "magenta", 1); 

    time = dt;
    while(y > -1.0)
    {
      ax = -gammaV * vx; ay = -(gravity + gammaV * vy);
      vx += ax * dt; vy += ay * dt;
      x += vx * dt; y += vy * dt;
      drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "magenta", 1); 
    }
  }
}

function inertia()
{
  //慣性抵抗があるときの数値解法  
  var dt = parseFloat(form1.dt.value);//タイムステップ[s]
  var speed0 = parseFloat(form1.speed0.value);//初速度[m/s]
  var angle0 = parseFloat(form1.angle0.value);//放射角度[deg]

  var dia = parseFloat(form1.dia.value);
  var mass = parseFloat(form1.mass.value);
  var rho = 1.2;//20°Cの空気に対する密度[kg/m^3]
  var A = Math.PI * dia * dia / 4;//球断面積
  var Ci = 0.25 * rho * A;
  var gammaI = Ci / mass;

  if(form1.m_for.checked) forwardEuler();
  if(form1.m_back.checked) backwardEuler();
  if(form1.m_improved.checked) improvedEuler();
  if(form1.m_frog.checked) leap_frog();
  
  function forwardEuler()
  {
    //前進オイラー法
    var x, y, vx, vy, ax, ay, speed; 
    //初期値
    x = 0.0; y = 0.0; 
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
  
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "red", 1); 
    while(y > -1.0)
    {
　    x += vx * dt; 
      y += vy * dt;
      speed = Math.sqrt(vx * vx + vy * vy);
      ax = - gammaI * speed * vx ;
      ay = - (gravity + gammaI * speed * vy) ;
      vx += ax * dt;
      vy += ay * dt;
      drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "red", 1); 
    }
  }
   
  function backwardEuler()
  {
    //後退オイラー法
    var x, y, vx, vy, ax, ay, speed;
    //初期値
    x = 0.0; y = 0.0; 
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸

    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "blue", 1); 
    while(y > -1.0)
    {
      speed = Math.sqrt(vx * vx + vy * vy);
      ax = -gammaI * speed * vx;
      ay = - (gravity + gammaI * speed * vy) ;
      vx += ax * dt;
      vy += ay * dt;
　    x += vx * dt; 
      y += vy * dt;
      drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "blue", 1); 
    }
  }

  function improvedEuler()
  {
    //改良オイラー法
    var x, y, vx, vy, ax, ay, vx1, vy1, ax1, ay1, speed;
    //初期値
    x = 0.0; y = 0.0;
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
    ax = -gammaI * speed0 * vx;
    ay = - (gravity + gammaI * speed0 * vy) ;
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "green", 1); 
    while(y > -1.0)
    { 
      vx1 = vx + ax * dt;
      vy1 = vy + ay * dt;
      //位置の更新
      x += 0.5 * (vx + vx1) * dt;
      y += 0.5 * (vy + vy1) * dt;
      //加速度の更新
      speed = Math.sqrt(vx * vx + vy * vy);   
      ax1 = -gammaI * speed * vx1;
      ay1 = - (gravity + gammaI * speed * vy1) ;
      //速度の更新
      vx += 0.5 * (ax + ax1) * dt;
      vy += 0.5 * (ay + ay1) * dt;
      ax = ax1; ay = ay1;//ax1, ay1を次の時刻の加速度にする
      drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "green", 1); 
    }
  }

  function leap_frog()
  {
    //かえる跳び法
    var x, y, vx, vy, ax, ay, speed;
    //初期値
    x = 0.0; y = 0.0; 
    vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
    vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "red", 1); 
    //最初のかえる跳び
    speed = Math.sqrt(vx * vx + vy * vy);
    ax = -gammaI * speed * vx; 
    ay = -(gravity + gammaI * speed * vy);
    vx += ax * dt / 2; vy += ay * dt / 2;
    x += vx * dt; y += vy * dt;
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "magenta", 1); 

    while(y > -1.0)
    {
      speed = Math.sqrt(vx * vx + vy * vy);
      ax = -gammaI * speed * vx;
      ay = -(gravity + gammaI * speed * vy);
      vx += ax * dt; 
      vy += ay * dt;
      x += vx * dt; 
      y += vy * dt;
      drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "magenta", 1); 
    }
  }
}

//-------------------------------------------------------------
function onClickClear()
{
  drawCoordinates();
}

function onChangeResistance()
{
  var radio1 =  document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) resistanceNo = i;
     if(resistanceNo == 2) form1.m_analysis.checked = false; 
  }
}

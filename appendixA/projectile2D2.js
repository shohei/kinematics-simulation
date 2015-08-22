/*-------------------------------------------
     projectile2D2.js
     2次元放物運動2
--------------------------------------------*/
var canvas; //キャンバス要素
var ctx;//コンテキスト

var flagStart = false;

var factor = 5;//表示倍率(1[m]のピクセル数
var X0, Y0;//表示座標原点（canvas座標）
var timer;

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
  clearCanvas("white");
  //表示座標原点
  var w0 = 50;
  X0 = w0;
  Y0 = canvas.height - w0 + 20;
  //座標軸の表示
  //x軸
  drawLine(X0, Y0, canvas.width -20, Y0, "rgb(100, 100, 255)", 1);
  //y軸
  drawLine(X0, Y0, X0, 20, "rgb(100, 100, 255)", 1);
  //x軸目盛
  drawLine(X0 + 50 * factor, Y0, X0 + 50 * factor,  Y0 - 30,  "rgb(100, 100, 255)", 1);
  drawLine(X0 + 100 * factor, Y0, X0 + 100 * factor,  Y0 - 40,  "rgb(100, 100, 255)", 1);
  drawText("0", X0 -10, Y0 + 20, "black", 2, 2);
  drawLine(X0 + 150 * factor, Y0, X0 + 150 * factor,  Y0 - 30,  "rgb(100, 100, 255)", 1);
  drawText("50", X0 + 50 * factor -10, Y0 + 20, "black", 2, 2);
  drawText("100", X0 + 100 * factor - 10 , Y0 + 20, "black", 2, 2);
  drawText("150", X0 + 150 * factor - 10 , Y0 + 20, "black", 2, 2);
  //y軸目盛
  drawLine(X0, Y0 - 50 * factor, X0 + 30,  Y0 - 50 * factor,  "rgb(100, 100, 255)", 1);
  drawText("50", X0 - 30, Y0 - 50 * factor + 10, "black", 2, 2);
}

function onClickStart()
{
  //物理定数
  var gravity = 9.8;//重力加速度[m/s^2] 
  var rho = 1.2;//20°Cの空気に対する密度[kg/m^3]
  //慣性抵抗だけで計算
  var dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
  var speed0 = parseFloat(form1.speed0.value);//初速度[m/s]
  var angle0 = parseFloat(form1.angle0.value);//放射角度[deg]

  var dia = parseFloat(form1.dia.value);
  var mass = parseFloat(form1.mass.value);
  var A = Math.PI * dia * dia / 4;//球断面積
  var Ci = 0.25 * rho * A;
  var gammaI = Ci / mass;
  var restitution = parseFloat(form1.restitution.value);

  //かえる跳び法
  var x, y, vx, vy, ax, ay, speed;
    
  //初期値
  x = 0.0; y = 0.0; 
  vx = speed0 * Math.cos(Math.PI * angle0 / 180.0);//水平軸
  vy = speed0 * Math.sin(Math.PI * angle0 / 180.0);//鉛直軸

  drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "black", 1); 
  //最初のかえる跳び
  speed = Math.sqrt(vx * vx + vy * vy);
  ax = -gammaI * speed * vx; 
  ay = -(gravity + gammaI * speed * vy);
  vx += ax * dt / 2; vy += ay * dt / 2;
  x += vx * dt; y += vy * dt;
  drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "black", 1); 

  function simulate()
  {
    speed = Math.sqrt(vx * vx + vy * vy);
    ax = -gammaI * speed * vx;
    ay = -(gravity + gammaI * speed * vy);
    vx += ax * dt; 
    vy += ay * dt;
    x += vx * dt; 
    y += vy * dt;
    if(y < 0.0) y = 0.0;
    drawCircle(X0 + x * factor, Y0 - y * factor, 1, 0, "black", 1);
    if(vy < 0.0 && y < 0.001) vy *= - restitution;
    if(x*factor + X0 > canvas.width -10) clearInterval(timer);
    if(vx < 0.1) clearInterval(timer);
  }
  timer = setInterval(simulate, dt * 1000);
}

//-------------------------------------------------------------
function onClickClear()
{
  clearInterval(timer);
  drawCoordinates();
}

function onChangeResistance()
{
  var radio1 =  document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) resistanceNo = i;
  }
}

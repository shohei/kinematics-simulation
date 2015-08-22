/*-------------------------------------------
     ForcedOscillatin2D.js
     強制振動
--------------------------------------------*/
var canvas; //キャンバス要素
var ctx;//コンテキスト
var dt, actTime, mass, constK, length0, disp0, amp, omega, forceE;
var gamma ;//減衰率
var X0, Y0;//表示座標原点（ピクセル単位、canvas座標）
var widthX, widthY;//データ表示幅（ピクセル単位）
var numData;

function main() 
{
  //canvas要素を取得する
  canvas = document.getElementById('myCanvas');
  
  //描画コンテキストを取得
  ctx = canvas.getContext("2d");

  getData();
}

function getData()
{
　dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
　actTime = parseFloat(form1.actTime.value);//計算時間[s]
　mass = parseFloat(form1.mass.value);//質量[kg]
　constK = parseFloat(form1.constK.value);//バネ定数[N/m]
　length0 = parseFloat(form1.length0.value);//自然長[m]
　disp0 = parseFloat(form1.disp0.value);//初期変位量[m]
  amp = parseFloat(form1.amp.value);//縦軸振幅[m]
  gamma = parseFloat(form1.gamma.value);//減衰率[1/s]
  omega = parseFloat(form1.omega.value);//強制信号角振動数[1/s]
  forceE = parseFloat(form1.forceE.value);//強制信号振幅[m]

  //共振角周波数
  var omega0 = Math.sqrt(constK / mass);
  form1.omega0.value = omega0.toString();
  drawCoordinates();
}

function drawCoordinates()
{
  //キャンバスを白でクリア
  clearCanvas("white");
  //表示座標原点
  var w0 = 50;
  X0 = w0;
  Y0 = canvas.height / 2;
  widthX = canvas.width - 2*w0;//横軸表示幅(ピクセル単位）
  widthY = canvas.height/2 - w0;//片側(ピクセル単位）
  //座標軸の表示
  //x軸
  drawLine(X0, Y0, X0 + widthX, Y0, "rgb(50, 50, 255)", 1);
  //y軸
  drawLine(X0, w0, X0, canvas.height-w0, "rgb(50, 50, 255)", 1);
  //x軸目盛
  drawLine(X0 + widthX/2, Y0, X0 + widthX/2 ,  Y0 - 20,  "rgb(100, 100, 100)", 1);
  drawLine(X0 + widthX, Y0, X0 + widthX, Y0 - 40,  "rgb(100, 100, 255)", 1);
  drawText(actTime+"[s]", X0 + widthX-5, Y0 + 20, "black", 2, 2);
  //y軸目盛
  drawLine(X0, Y0 - widthY, X0 + 20,  Y0 - widthY,  "rgb(100, 100, 255)", 1);
  drawLine(X0, Y0 + widthY, X0 + 20,  Y0 + widthY,  "rgb(100, 100, 255)", 1);
  drawText("0", X0 - 20, Y0 + 5, "black", 2, 2);
  drawText(amp, X0 - 30, Y0 - widthY + 5, "black", 2, 2);
  drawText("-"+amp, X0 - 35, Y0 + widthY + 5, "black", 2, 2);
  drawText("変位量[m]", X0 -40, Y0 - widthY -15, "black", 2, 2);
}

function onClickStart()
{
  var numData = parseFloat(form1.numData.value);//データ個数
　var factorX = widthX / numData;//横軸表示倍率(1データ個数当たりピクセル数）
　var factorY = widthY / amp ;//縦軸表示倍率(変位1[m]当たりのピクセル数

  //データ取り込み間隔
  var interval = Math.round((actTime / dt) / numData);
  var data0 = [];

  var length = length0 + disp0;
  var vel = 0.0;
  var pos = length;//一端は原点に固定
  var time = 0.0;//経過時間
  var count = 0;//データ個数のカウント
  var cnt = 0;//インターバルのカウント
 
  while (count < numData)
  {
    var disp = pos - length0;
    var acc = -constK * disp / mass - 2.0 * gamma * vel + forceE * Math.sin(omega * time);    
    vel += acc * dt;
    pos += vel * dt;
　　　
    time += dt;
    if (cnt == 0)
    {//interval回に1回保存
      data0.push([X0 + count * factorX, Y0 - disp * factorY]) ;//変位量のデータ(2次元)
      count++;
    }
    cnt++;
    if (cnt == interval) cnt = 0;
  }
  drawLines(data0, "black", 1);
}


//-------------------------------------------------------------
function onClickClear()
{
  drawCoordinates();
}

function onChangeData()
{
  getData();
}


/*-------------------------------------------
     Series2D.js
     3個のバネの直列接続
     両端固定、中間2個のブロックが振動
--------------------------------------------*/
var canvas; //キャンバス要素
var ctx;//コンテキスト
var actTime, amp;
var X0, Y01, Y02;//表示座標原点（ピクセル単位、canvas座標）
var widthX, widthY;//データ表示幅（ピクセル単位）

function main() 
{
  //canvas要素を取得する
  canvas = document.getElementById('myCanvas');
  
  //描画コンテキストを取得
  ctx = canvas.getContext("2d");

  drawCoordinates();
}

function getData()
{
/*
　dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
　actTime = parseFloat(form1.actTime.value);//計算時間[s]
　mass1 = parseFloat(form1.mass1.value);//質量[kg]
　mass2 = parseFloat(form1.mass2.value);//質量[kg]
　length0 = parseFloat(form1.length0.value);//自然長[m]
　disp01 = parseFloat(form1.disp01.value);//初期変位量[m]
　disp02 = parseFloat(form1.disp02.value);//初期変位量[m]
  amp = parseFloat(form1.amp.value);//縦軸振幅[m]
  constK0 = parseFloat(form1.constK0.value);//減衰率0[1/s]
  constK1 = parseFloat(form1.constK1.value);//減衰率1[1/s]
  constK2 = parseFloat(form1.constK2.value);//減衰率2[1/s]
*/
//  drawCoordinates();
}

function drawCoordinates()
{
　actTime = parseFloat(form1.actTime.value);//計算時間[s]
  amp = parseFloat(form1.amp.value);//縦軸振幅[m]
  //キャンバスを白でクリア
  clearCanvas("white");
  //表示座標原点
  var w0X = 50, w0Y = 20;
  X0 = w0X;
  Y01 = canvas.height / 4;
  widthX = canvas.width - 2*w0X;//横軸表示幅(ピクセル単位）
  widthY = canvas.height/4 - w0Y;//片側(ピクセル単位）

  //上段座標軸の表示
  //x軸
  drawLine(X0, Y01, X0 + widthX, Y01, "rgb(50, 50, 255)", 1);
  //y軸
  drawLine(X0, Y01+widthY, X0, Y01-widthY, "rgb(50, 50, 255)", 1);
  //drawLine(X0, w0Y, X0, canvas.height/2-w0Y, "rgb(50, 50, 255)", 1);
  //x軸目盛
  drawLine(X0 + widthX/2, Y01, X0 + widthX/2 ,  Y01 - 20,  "rgb(100, 100, 100)", 1);
  drawLine(X0 + widthX, Y01, X0 + widthX, Y01 - 40,  "rgb(100, 100, 255)", 1);
  drawText(actTime+"[s]", X0 + widthX-5, Y01 + 20, "black", 2, 2);
  //y軸目盛
  drawLine(X0, Y01 - widthY, X0 + 20,  Y01 - widthY,  "rgb(100, 100, 255)", 1);
  drawLine(X0, Y01 + widthY, X0 + 20,  Y01 + widthY,  "rgb(100, 100, 255)", 1);
  drawText("0", X0 - 20, Y01 + 5, "black", 2, 2);
  drawText(amp, X0 - 30, Y01 - widthY + 5, "black", 2, 2);
  drawText("-"+amp, X0 - 35, Y01 + widthY + 5, "black", 2, 2);
  drawText("disp1[m]", X0 +30, Y01 - widthY, "black", 2, 2);
  
  //下段座標軸の表示
  Y02 = 3* canvas.height / 4;
  //x軸
  drawLine(X0, Y02, X0 + widthX, Y02, "rgb(50, 50, 255)", 1);
  //y軸
  drawLine(X0, Y02+widthY, X0, Y02-widthY, "rgb(50, 50, 255)", 1);
  //x軸目盛
  drawLine(X0 + widthX/2, Y02, X0 + widthX/2 ,  Y02 - 20,  "rgb(100, 100, 100)", 1);
  drawLine(X0 + widthX, Y02, X0 + widthX, Y02 - 40,  "rgb(100, 100, 255)", 1);
  drawText(actTime+"[s]", X0 + widthX-5, Y02 + 20, "black", 2, 2);
  //y軸目盛
  drawLine(X0, Y02 - widthY, X0 + 20,  Y02 - widthY,  "rgb(100, 100, 255)", 1);
  drawLine(X0, Y02 + widthY, X0 + 20,  Y02 + widthY,  "rgb(100, 100, 255)", 1);
  drawText("0", X0 - 20, Y02 + 5, "black", 2, 2);
  drawText(amp, X0 - 30, Y02 - widthY + 5, "black", 2, 2);
  drawText("-"+amp, X0 - 35, Y02 + widthY + 5, "black", 2, 2);
  drawText("disp2[m]", X0 +30, Y02 - widthY, "black", 2, 2);
}

function onClickStart()
{
　var dt = parseFloat(form1.dt.value);//計算時のタイムステップ[s]
　var mass1 = parseFloat(form1.mass1.value);//質量[kg]
　var mass2 = parseFloat(form1.mass2.value);//質量[kg]
　var length0 = parseFloat(form1.length0.value);//自然長[m]
　var disp01 = parseFloat(form1.disp01.value);//初期変位量[m]
　var disp02 = parseFloat(form1.disp02.value);//初期変位量[m]
  var constK0 = parseFloat(form1.constK0.value);//バネ定数[N/m]
  var constK1 = parseFloat(form1.constK1.value);
  var constK2 = parseFloat(form1.constK2.value);
  var numData = parseFloat(form1.numData.value);//データ個数
　var factorX = widthX / numData;//横軸表示倍率(1データ個数当たりピクセル数）
　var factorY = widthY / amp ;//縦軸表示倍率(変位1[m]当たりのピクセル数

  //データ取り込み間隔
  var interval = Math.round((actTime / dt) / numData);
  var data0 = [], data1 = [];

  var vel1 = 0.0;
  var vel2 = 0.0;
  var pos1 = length0 + disp01;//左端は原点に固定
  var pos2 = length0 * 2 + disp02;
  var time = 0.0;//経過時間
  var count = 0;//データ個数のカウント
  var cnt = 0;//インターバルのカウント
 
  while (count < numData)
  {
    var disp1 = pos1 - length0;
    var disp2 = pos2 - 2 * length0;
    var acc1 = (-(constK0 + constK1) * disp1 + constK1 * disp2) / mass1;
    var acc2 = (constK1 * disp1 - (constK1 + constK2) * disp2) / mass2;
    vel1 += acc1 * dt;
    pos1 += vel1 * dt;
    vel2 += acc2 * dt;
    pos2 += vel2 * dt;

    if (cnt == 0)
    {//interval回に1回保存
      data0.push([X0 + count * factorX, Y01 - disp1 * factorY]) ;//変位量のデータ(2次元)
      data1.push([X0 + count * factorX, Y02 - disp2 * factorY]) ;
//console.log("count = " + count + " x= " + data[count][0] + " y= " + data[count][1]);
      count++;
    }
    cnt++;
    if (cnt == interval) cnt = 0;
  }
  drawLines(data0, "black", 1);
  drawLines(data1, "black", 1);
}


//-------------------------------------------------------------
function onClickClear()
{
  drawCoordinates();
}

function onChangeData()
{
  drawCoordinates();
}


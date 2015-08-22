/*----------------------------------------------
  swgSpringMassAnimal.js
  仮想動物のバネ質点モデル
-----------------------------------------------*/
var gravity = 9.8;

function SpringMassAnimal()
{
  this.type = 0;//4足動物、昆虫型、恐竜型
  this.mode = 0;//歩行モード
  this.numSpring = 1;
  this.numPoint = this.numSpring + 1;
  this.mass = 0.1;//質点１個当たりの質量(kg)
  this.constK = 200;//構造バネ1個当たりのバネ定数
  this.drctnK = 20;//方向バネ
  this.damping = 0.1;//0.5;
  this.drag = 0.1;

  this.length0 = 1.2;//脚バネの自然長
  this.radius = 0.1 ;//バネの半径
  this.dir;//進行方向（x軸からの偏角）
  this.dir0;//バネの初期設定方向
  this.theta1 = 20;//前傾角
  this.vPos = this.vPos0 = new Vector3();
  this.vVel = new Vector3();
  this.vForce = new Vector3();//外力の初期値
  this.vForce0 = new Vector3();//外力の初期値
  this.spring = [];
  this.point = [];
  this.shadow = 0;
  this.rootNo = 1; 
}
//-----------------------------------------------------------------
SpringMassAnimal.prototype.create = function()
{
  var len = this.length0;
  var wid = 0.2 * len;
  var rad = this.radius;
  //質点のサイズ,質量
  for(var i = 0; i < 22; i++)
  {
    this.point[i] = new Rigid();
    this.point[i].kind = "SPHERE";
	this.point[i].mass = this.mass;
  }
  //バネ
  for(var i = 0; i < 21; i++)
  {
    this.spring[i] = new Rigid();
    this.spring[i].kind = "CYLINDER"; 
	this.spring[i].radius = rad;
	this.spring[i].radiusRatio = 1;
  }
  
  if(this.type == 0)
  {//4足動物
	this.numSpring = 12;
	this.numPoint = 13;
	var lenTrunk = 0.5 * len;
	this.rootNo = 5;//中心胴体

	//point
	//後足
	this.point[0].vPos = add(new Vector3(-wid, -lenTrunk, rad), this.vPos);//左
	this.point[1].vPos = add(new Vector3( wid, -lenTrunk, rad), this.vPos);//右
	this.point[0].vSize = this.point[1].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//腰
	this.point[2].vPos = add(new Vector3(-wid, -lenTrunk, rad + len), this.vPos);//左腰
	this.point[3].vPos = add(new Vector3( wid, -lenTrunk, rad + len), this.vPos);//右腰
	this.point[2].vSize = this.point[3].vSize = mul(new Vector3(3.0, 3.0, 3.0), rad);
	//後胴体
	this.point[4].vPos = add(new Vector3( 0.0, -lenTrunk, rad + len), this.vPos);
	this.point[4].vSize = mul(new Vector3(5.0, 5.0, 5.0), rad);
	//中心胴体
	this.point[5].vPos = add(new Vector3( 0.0, 0.0, rad + len), this.vPos);
	this.point[5].vSize = mul(new Vector3(5.0, 5.0, 5.0), rad);
	//前胴体
	this.point[6].vPos = add(new Vector3( 0.0, lenTrunk, rad + len), this.vPos);
	this.point[6].vSize = mul(new Vector3(5.0, 5.0, 5.0), rad);
	//頭
	this.point[7].vPos = add(new Vector3( 0.0, 2.0*lenTrunk, rad + 1.5*len), this.vPos);//頭
	this.point[7].vSize = mul(new Vector3(8.0, 8.0, 8.0), rad);
	//肩
	this.point[8].vPos = add(new Vector3(-wid, lenTrunk, rad + len), this.vPos);//左
	this.point[9].vPos = add(new Vector3( wid, lenTrunk, rad + len), this.vPos);//右
	this.point[8].vSize = this.point[9].vSize = mul(new Vector3(3.0, 3.0, 3.0), rad);
	//前足
	this.point[10].vPos = add(new Vector3(-wid, lenTrunk, rad), this.vPos);
	this.point[11].vPos = add(new Vector3( wid, lenTrunk, rad), this.vPos);
	this.point[10].vSize = this.point[11].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//尾の先端
	this.point[12].vPos = add(new Vector3( 0, -lenTrunk*1.8, rad + len * 1.2), this.vPos);
	this.point[12].vSize = mul(new Vector3(2.0, 3.0, 3.0), rad);

	//spring
	//後脚(spring)
	this.spring[0].row1 = 0; this.spring[0].row2 = 2;//左
	this.spring[1].row1 = 1; this.spring[1].row2 = 3;//右
	//腰(spring)
	this.spring[2].row1 = 2; this.spring[2].row2 = 4;//左
	this.spring[3].row1 = 4; this.spring[3].row2 = 3;//右
	//後背骨
	this.spring[4].row1 = 4; this.spring[4].row2 = 5;
	//前背骨
	this.spring[5].row1 = 5; this.spring[5].row2 = 6;
	//首
	this.spring[6].row1 = 6; this.spring[6].row2 = 7;
	//鎖骨
	this.spring[7].row1 = 8; this.spring[7].row2 = 6;
	this.spring[8].row1 = 6; this.spring[8].row2 = 9;
	//前脚
	this.spring[9].row1  = 8; this.spring[9].row2  = 10;//左
	this.spring[10].row1 = 9; this.spring[10].row2 = 11;//右
	//尾
	this.spring[11].row1 = 4; this.spring[11].row2 = 12;
  }

  if(this.type == 1)//昆虫型
  {
    this.numSpring = 16;
	this.numPoint = 17;
	var lenTrunk = 0.5 * len;
	this.rootNo = 9;//中心胴体
	//point
	//後足
	this.point[0].vPos = add(new Vector3(-2.0*wid, -lenTrunk, rad), this.vPos);//左
	this.point[1].vPos = add(new Vector3( 2.0*wid, -lenTrunk, rad), this.vPos);//右
	this.point[0].vSize = this.point[1].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//後膝
	this.point[2].vPos = add(new Vector3(-wid, -lenTrunk, rad + len), this.vPos);//左
	this.point[3].vPos = add(new Vector3( wid, -lenTrunk, rad + len), this.vPos);//右
	this.point[2].vSize = this.point[3].vSize = mul(new Vector3(1.5, 1.5, 1.5), rad);
	//後胴体
	this.point[4].vPos = add(new Vector3( 0.0, -lenTrunk, rad + len * 0.7), this.vPos);
	this.point[4].vSize = mul(new Vector3(5.0, 5.0, 5.0), rad);
	//中足
	this.point[5].vPos = add(new Vector3(-1.5*wid, 0.0, rad), this.vPos);//左
	this.point[6].vPos = add(new Vector3( 1.5*wid, 0.0, rad), this.vPos);//右
	this.point[5].vSize = this.point[6].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);

	//中膝
	this.point[7].vPos = add(new Vector3(-wid, 0.0, rad + len), this.vPos);//左
	this.point[8].vPos = add(new Vector3( wid, 0.0, rad + len), this.vPos);//右
	this.point[7].vSize = this.point[8].vSize = mul(new Vector3(1.5, 1.5, 1.5), rad);
	//中心胴体
	this.point[9].vPos = add(new Vector3( 0.0, 0.0, rad + len * 0.7), this.vPos);
	this.point[9].vSize = mul(new Vector3(3.0, 3.0, 3.0), rad);
	//前足
	this.point[10].vPos = add(new Vector3(-2.0*wid, lenTrunk, rad), this.vPos);//左
	this.point[11].vPos = add(new Vector3( 2.0*wid, lenTrunk, rad), this.vPos);//右
	this.point[10].vSize = this.point[11].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//前肘（膝）
	this.point[12].vPos = add(new Vector3(-wid, lenTrunk, rad + len*1.2), this.vPos);//左
	this.point[13].vPos = add(new Vector3( wid, lenTrunk, rad + len*1.2), this.vPos);//右
	this.point[12].vSize = this.point[13].vSize = mul(new Vector3(1.5, 1.5, 1.5), rad);
	//前胴体
	this.point[14].vPos = add(new Vector3( 0.0, lenTrunk, rad + len), this.vPos);
	this.point[14].vSize =mul( new Vector3(5.0, 5.0, 5.0), rad);
	//頭
	this.point[15].vPos = add(new Vector3( 0.0, 2.0*lenTrunk, rad + 1.5*len), this.vPos);//頭
	this.point[15].vSize = mul(new Vector3(8.0, 8.0, 8.0), rad);
	//尾の先端
	this.point[16].vPos = add(new Vector3( 0, -lenTrunk*1.8, rad + len * 1.0), this.vPos);
	this.point[16].vSize = mul(new Vector3(2.0, 3.0, 3.0), rad);

	//spring
	//後脛
	this.spring[0].row1 = 0; this.spring[0].row2 = 2;//左
	this.spring[1].row1 = 1; this.spring[1].row2 = 3;//右
	//後腿
	this.spring[2].row1 = 2; this.spring[2].row2 = 4;//左
	this.spring[3].row1 = 3; this.spring[3].row2 = 4;//右
	//中脛
	this.spring[5].row1 = 5; this.spring[5].row2 = 7;//左
	this.spring[6].row1 = 6; this.spring[6].row2 = 8;//右
	//中腿
	this.spring[7].row1 = 7; this.spring[7].row2 = 9;//左
	this.spring[8].row1 = 8; this.spring[8].row2 = 9;//右
	//前脛
	this.spring[10].row1 = 10; this.spring[10].row2 = 12;//左
	this.spring[11].row1 = 11; this.spring[11].row2 = 13;//右
	//前腿
	this.spring[12].row1 = 12; this.spring[12].row2 = 14;//左
	this.spring[13].row1 = 13; this.spring[13].row2 = 14;//右
	//後背骨
	this.spring[4].row1 = 4; this.spring[4].row2 = 9;
	//前背骨
	this.spring[9].row1 = 9; this.spring[9].row2 = 14;
	//首
	this.spring[14].row1 = 14; this.spring[14].row2 = 15;
	//尾
	this.spring[15].row1 = 4; this.spring[15].row2 = 16;
  }
  else if(this.type == 2)//恐竜型
  {
	this.numSpring = 21;
    this.numPoint = 22;
	var len1 = 0.25 * len;
	this.rootNo = 5;

	var lambda = 1.3 * len;
	//質点の位置
	for(var i = 0; i <= 9; i++)
	{//背骨（胴体）
	  this.point[i].vPos = add(new Vector3(0.0, -(i-5) * len1, rad + len - (i-5) * len1 + 0.2 * Math.cos(2.0 * Math.PI * (i-5)*len1 / lambda + Math.PI/3.0) ), this.vPos);
	  this.point[i].vSize = mul(new Vector3(2.0, 2.0, 2.0) , rad);
	}
    this.point[0].vSize = mul(new Vector3(5.0, 5.0, 5.0) , rad);//頭
	//腰
	this.point[10].vPos = add(new Vector3(-wid, 0.0, rad + 1.2 * len), this.vPos);//左腰
	this.point[11].vPos = add(new Vector3( wid, 0.0, rad + 1.2 * len), this.vPos);//右腰
	this.point[10].vSize = this.point[11].vSize = mul(new Vector3(3.0, 3.0, 3.0), rad);
	//膝
	this.point[12].vPos = add(new Vector3(-wid, 0.0, rad + len * 0.6), this.vPos);//左
	this.point[13].vPos = add(new Vector3( wid, 0.0, rad + len * 0.6), this.vPos);//右
	this.point[12].vSize = this.point[13].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//足
	this.point[14].vPos = add(new Vector3(-wid*len, 0.0, rad), this.vPos);//左足
	this.point[15].vPos = add(new Vector3( wid*len, 0.0, rad), this.vPos);//右足
	this.point[14].vSize = this.point[15].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//肩
	this.point[16].vPos = add(this.point[3].vPos, new Vector3(-wid, 0.0, 0.0));
	this.point[17].vPos = add(this.point[3].vPos, new Vector3( wid, 0.0, 0.0));
	this.point[16].vSize = this.point[17].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//肘
	this.point[18].vPos = add(this.point[16].vPos, new Vector3(0.0, 0.0, - len * 0.3));
	this.point[19].vPos = add(this.point[17].vPos, new Vector3(0.0, 0.0, - len * 0.3));
	this.point[18].vSize = this.point[19].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//手
	this.point[20].vPos = add(this.point[18].vPos, new Vector3(0.0, len * 0.2, len * 0.1));
	this.point[21].vPos = add(this.point[19].vPos, new Vector3(0.0, len * 0.2, len * 0.1));
	this.point[20].vSize = this.point[21].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
	//spring
	for(i = 0; i <= 8; i++)
	{//背骨
	  this.spring[i].row1 = i; this.spring[i].row2 = i+1;
	}
	//腰
	this.spring[9].row1 = 10; this.spring[9].row2 = 5;//左腰
	this.spring[10].row1 = 5; this.spring[10].row2 = 11;//右腰
	
	//腿
	this.spring[11].row1 = 10; this.spring[11].row2 = 12;//左
	this.spring[12].row1 = 11; this.spring[12].row2 = 13;//右
	//脛
	this.spring[13].row1 = 12; this.spring[13].row2 = 14;//左
	this.spring[14].row1 = 13; this.spring[14].row2 = 15;//右

	//鎖骨
	this.spring[15].row1 = 16; this.spring[15].row2 = 3;
	this.spring[16].row1 = 3; this.spring[16].row2 = 17;
	//上腕
	this.spring[17].row1 = 16; this.spring[17].row2 = 18;
	this.spring[18].row1 = 17; this.spring[18].row2 = 19;
	//前腕
	this.spring[19].row1 = 18; this.spring[19].row2 = 20;
	this.spring[20].row1 = 19; this.spring[20].row2 = 21;
  }
  //バネの自然長と方向ベクトル
  var n1, n2;
  for(var i = 0; i < this.numSpring; i++)
  {
	n1 = this.spring[i].row1; n2 = this.spring[i].row2;
	this.spring[i].length0 = distance(this.point[n1].vPos, this.point[n2].vPos);
	this.spring[i].vDir0 = direction(this.point[n1].vPos, this.point[n2].vPos);
  }
  //進行方向初期値がy軸方向でないとき質点の位置/バネの方向ベクトルも変える
  var alpha = this.dir0 - Math.PI/2.0;
  if(alpha != 0.0)
  {
    for(var i = 0; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
	//質点の座標
	for(var i = 0; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
  }
}

//-----------------------------------------------------------------
SpringMassAnimal.prototype.draw = function(gl)
{
  var i, r1, r2;

  //ばね質点表示
  //質点
  var n = this.point[0].initVertexBuffers(gl);
  for(i = 0; i < this.numPoint; i++) 
//  for(i = 0; i < 18; i++) 
  {
    if(this.point[i].flagFixed == true)
    {
      this.point[i].diffuse = [0.8, 0.2, 0.2, 1.0];
      this.point[i].ambient = [0.4, 0.1, 0.1, 1.0];
    }
    else
    {
	  this.point[i].diffuse  = [0.2, 0.9, 0.9, 1.0];
	  this.point[i].ambient  = [0.1, 0.5, 0.5, 1.0];
    }
    this.point[i].shadow = this.shadow;
    this.point[i].draw(gl, n);
  }

  var rad = this.radius;
  //バネ
  n = this.spring[0].initVertexBuffers(gl);
  for(i = 0; i < this.numSpring ; i++)
  {
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    this.spring[i].vPos = div(add(this.point[r1].vPos, this.point[r2].vPos), 2);
    var len = distance(this.point[r1].vPos, this.point[r2].vPos);
    this.spring[i].vSize = new Vector3(rad, rad, len);
    this.spring[i].vEuler = getEulerZ(this.point[r1].vPos, this.point[r2].vPos);
    this.spring[i].shadow = this.shadow;
    this.spring[i].draw(gl, n);
  }
}
//-------------------------------------------------------------------
SpringMassAnimal.prototype.walk0 = function(tt)
{
  var i, theta, thetaDegL, thetaDegR, dist;
  var cc = Math.cos(this.dir);
  var ss = Math.sin(this.dir);
  var vDirection = new Vector3(cc, ss , 0.0);//進行方向のベクトル

  //左脚の水平方向距離（符号付き）
  dist = dot(sub(this.point[2].vPos, this.point[0].vPos), vDirection);
  //左脚の角度
  theta = Math.atan2(dist, this.point[2].vPos.z - this.point[0].vPos.z); 
  thetaDegL = theta * RAD_TO_DEG;
  //右脚の水平方向距離（符号付き）
  dist = dot(sub(this.point[3].vPos, this.point[1].vPos), vDirection);
  //右脚の角度
  theta = Math.atan2(dist, this.point[3].vPos.z - this.point[1].vPos.z); 
  thetaDegR = theta * RAD_TO_DEG;

  for(i = 2; i < this.numPoint; i++)
  {
    this.point[i].vVel.x = this.speed * cc;
    this.point[i].vVel.y = this.speed * ss;
  }

  if(this.mode == 0)
  {//後左足/前右足を固定，後右足/前左足出す
    this.point[0].flagFixed = true;//後左足
	this.point[11].flagFixed = true;//前右足
	this.point[1].flagFixed = false;//後右足
	this.point[10].flagFixed = false;//前左足
	this.point[1].vVel.x = 2.0*this.speed * cc;
	this.point[1].vVel.y = 2.0*this.speed * ss;
	this.point[1].vForce0.z = 100.0 * this.mass;
	this.point[10].vVel.x = 2.0*this.speed * cc;
	this.point[10].vVel.y = 2.0*this.speed * ss;
	this.point[10].vForce0.z = 100.0 * this.mass;
	if(thetaDegL > this.theta1/2.0) this.mode = 1;
  }
  else if(this.mode == 1)
  {//後左足/前右足を固定，後右足/前左足出す,
	this.point[0].flagFixed = true;//後左足
	this.point[11].flagFixed = true;//前右足
	this.point[1].flagFixed = false;//後右足
	this.point[10].flagFixed = false;//前左足
	this.point[1].vVel.x = 2.0*this.speed * cc;
	this.point[1].vVel.y = 2.0*this.speed * ss;
	this.point[1].vForce0.z = 0.0;
	this.point[10].vVel.x = 2.0*this.speed * cc;
	this.point[10].vVel.y = 2.0*this.speed * ss;
	this.point[10].vForce0.z = 0.0;
	if(thetaDegL > this.theta1) this.mode = 2;
  }
  else if(this.mode == 2)
  {//後右足/前左足固定，後左足/前右足出す
	this.point[0].flagFixed = false;
	this.point[11].flagFixed = false;
	this.point[1].flagFixed = true;
	this.point[10].flagFixed = true;
	this.point[0].vVel.x = 2.0*this.speed * cc;
	this.point[0].vVel.y = 2.0*this.speed * ss;
	this.point[0].vForce0.z = 200.0 * this.mass;
	this.point[11].vVel.x = 2.0*this.speed * cc;
	this.point[11].vVel.y = 2.0*this.speed * ss;
	this.point[11].vForce0.z = 100.0 * this.mass;
	if(thetaDegR > this.theta1/2.0) this.mode = 3;
  }
  else if(this.mode == 3)
  {//後右足/前左足固定，後左足/前右足出す
	this.point[0].flagFixed = false;
	this.point[11].flagFixed = false;
	this.point[1].flagFixed = true;
	this.point[10].flagFixed = true;
	this.point[0].vVel.x = 2.0*this.speed * cc;
	this.point[0].vVel.y = 2.0*this.speed * ss;
	this.point[0].vForce0.z = 0.0;
	this.point[11].vVel.x = 2.0*this.speed * cc;
	this.point[11].vVel.y = 2.0*this.speed * ss;
	this.point[11].vForce0.z = 0.0;
	if(thetaDegR > this.theta1) this.mode = 0;
  }
  //進行方向が変化したときバネの方向ベクトル,質点の位置も変える
  var alpha = this.dir - this.dir0;
  if(alpha != 0.0)
  {
    //バネの方向
	for(i = 0; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
	//質点の座標
	for(i = 0; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
	this.dir0 = this.dir;
  }
  this.calcSpringMass(tt);
}

//-------------------------------------------------------------------
SpringMassAnimal.prototype.walk1 = function(tt)
{
  var i, theta, thetaDegL, thetaDegR, dist;
  var cc = Math.cos(this.dir);
  var ss = Math.sin(this.dir);
  var vDirection = new Vector3(cc, ss , 0.0);//進行方向のベクトル

  //左脚の水平方向距離（符号付き）
  dist = dot(sub(this.point[2].vPos, this.point[0].vPos), vDirection);
  //左脚の角度
  theta = Math.atan2(dist, this.point[2].vPos.z - this.point[0].vPos.z); 
  thetaDegL = theta * RAD_TO_DEG;
  //右脚の水平方向距離（符号付き）
  dist = dot(sub(this.point[3].vPos, this.point[1].vPos), vDirection);
  //右脚の角度
  theta = Math.atan2(dist, this.point[3].vPos.z - this.point[1].vPos.z); 
  thetaDegR = theta * RAD_TO_DEG;

  for(i = 2; i < this.numPoint; i++)
  {
    this.point[i].vVel.x = this.speed * cc;
    this.point[i].vVel.y = this.speed * ss;
  }

  if(this.mode == 0)
  {//後左足/中右足/前左足を固定，後右足/中左足/前右足出す
 	this.point[0].flagFixed = true;//後左足
	this.point[6].flagFixed = true;//中右足
	this.point[10].flagFixed = true;//前左足
	this.point[1].flagFixed = false;//後右足
	this.point[5].flagFixed = false;//中左足
	this.point[11].flagFixed = false;//前右足
	this.point[1].vVel.x = 2.0*this.speed * cc;
	this.point[1].vVel.y = 2.0*this.speed * ss;
	this.point[1].vForce0.z = 100.0 * this.mass;
	this.point[5].vVel.x = 2.0*this.speed * cc;
	this.point[5].vVel.y = 2.0*this.speed * ss;
	this.point[5].vForce0.z = 100.0 * this.mass;
	this.point[11].vVel.x = 2.0*this.speed * cc;
	this.point[11].vVel.y = 2.0*this.speed * ss;
	this.point[11].vForce0.z = 100.0 * this.mass;
	if(thetaDegL > this.theta1/2.0) this.mode = 1;
  }
  else if(this.mode == 1)
  {//後左足/中右足/前左足を固定，後右足/中左足/前右足出す
	this.point[0].flagFixed = true;//後左足
	this.point[6].flagFixed = true;//中右足
	this.point[10].flagFixed = true;//前左足
	this.point[1].flagFixed = false;//後右足
	this.point[5].flagFixed = false;//中左足
	this.point[11].flagFixed = false;//前右足
	this.point[1].vVel.x = 2.0*this.speed * cc;
	this.point[1].vVel.y = 2.0*this.speed * ss;
	this.point[1].vForce0.z = 0.0;
	this.point[5].vVel.x = 2.0*this.speed * cc;
	this.point[5].vVel.y = 2.0*this.speed * ss;
	this.point[5].vForce0.z = 0.0;
	this.point[11].vVel.x = 2.0*this.speed * cc;
	this.point[11].vVel.y = 2.0*this.speed * ss;
	this.point[11].vForce0.z = 0.0;
	if(thetaDegL > this.theta1) this.mode = 2;
  }
  else if(this.mode == 2)
  {//後右足/中左/前右足固定，後左足/中右足/前左足出す
	this.point[0].flagFixed = false;//後左足
	this.point[6].flagFixed = false;//中右足
	this.point[10].flagFixed = false;//前左足
	this.point[1].flagFixed = true;//後右足
	this.point[5].flagFixed = true;//中左足
	this.point[11].flagFixed = true;//前右足
	this.point[0].vVel.x = 2.0*this.speed * cc;
	this.point[0].vVel.y = 2.0*this.speed * ss;
	this.point[0].vForce0.z = 100.0 * this.mass;
	this.point[6].vVel.x = 2.0*this.speed * cc;
	this.point[6].vVel.y = 2.0*this.speed * ss;
	this.point[6].vForce0.z = 100.0 * this.mass;
	this.point[10].vVel.x = 2.0*this.speed * cc;
	this.point[10].vVel.y = 2.0*this.speed * ss;
	this.point[10].vForce0.z = 100.0 * this.mass;
	if(thetaDegR > this.theta1/2.0) this.mode = 3;
  }
  else if(this.mode == 3)
  {//後右足/中左/前右足固定，後左足/中右足/前左足出す
	this.point[0].flagFixed = false;//後左足
	this.point[6].flagFixed = false;//中右足
	this.point[10].flagFixed = false;//前左足
	this.point[1].flagFixed = true;//後右足
	this.point[5].flagFixed = true;//中左足
	this.point[11].flagFixed = true;//前右足
	this.point[0].vVel.x = 2.0*this.speed * cc;
	this.point[0].vVel.y = 2.0*this.speed * ss;
	this.point[0].vForce0.z = 100.0 * this.mass;
	this.point[6].vVel.x = 2.0*this.speed * cc;
	this.point[6].vVel.y = 2.0*this.speed * ss;
	this.point[6].vForce0.z = 0.0;
	this.point[10].vVel.x = 2.0*this.speed * cc;
	this.point[10].vVel.y = 2.0*this.speed * ss;
	this.point[10].vForce0.z = 0.0 ;
	if(thetaDegR > this.theta1) this.mode = 0;
  }

  //進行方向が変化したときバネの方向ベクトル,質点の位置も変える
  var alpha = this.dir - this.dir0;
  if(alpha != 0.0)
  {
    //バネの方向
	for(i = 0; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
	//質点の座標
	for(i = 0; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
	this.dir0 = this.dir;
  }
  this.calcSpringMass(tt);
}
//-------------------------------------------------------------------
SpringMassAnimal.prototype.walk2 = function(tt)
{
  var i, theta, thetaDegL, thetaDegR, dist;
  var cc = Math.cos(this.dir);
  var ss = Math.sin(this.dir);
  var vDirection = new Vector3(cc, ss , 0.0);//進行方向のベクトル

  //左脚の水平方向距離（符号付き）
  dist = dot(sub(this.point[10].vPos, this.point[14].vPos), vDirection);
  //左脚の角度
  theta = Math.atan2(dist, this.point[10].vPos.z - this.point[14].vPos.z); 
  thetaDegL = theta * RAD_TO_DEG;
  //右脚の水平方向距離（符号付き）
  dist = dot(sub(this.point[11].vPos, this.point[15].vPos), vDirection);
  //右脚の角度
  theta = Math.atan2(dist, this.point[11].vPos.z - this.point[15].vPos.z); 
  thetaDegR = theta * RAD_TO_DEG;

  for(i = 0; i < this.numPoint; i++)
  {
    this.point[i].vVel.x = this.speed * cc;
    this.point[i].vVel.y = this.speed * ss;
  }

  if(this.mode == 0)
  {//左足を固定，右足/左手出す,
	this.point[14].flagFixed = true;
	this.point[15].flagFixed = false;
	this.point[15].vVel.x = 2.0*this.speed * cc;
	this.point[15].vVel.y = 2.0*this.speed * ss;
	this.point[13].vVel.x = 2.0*this.speed * cc;
	this.point[13].vVel.y = 2.0*this.speed * ss;
	this.point[13].vForce0.z = 200.0 * this.mass;//右ひざ上げる
	this.point[20].vVel.x = 2.3*this.speed * cc;
	this.point[20].vVel.y = 2.3*this.speed * ss;
	this.point[21].vVel = new Vector3();
	if(thetaDegL > this.theta1/2.0) this.mode = 1;
  }
  else if(this.mode == 1)
  {//左足を固定，右足/左手出す,
 	this.point[14].flagFixed = true;
	this.point[15].flagFixed = false;
	this.point[15].vVel.x = 2.0*this.speed * cc;
	this.point[15].vVel.y = 2.0*this.speed * ss;
	this.point[13].vVel.x = 2.0*this.speed * cc;
	this.point[13].vVel.y = 2.0*this.speed * ss;
	this.point[13].vForce0.z = 0.0;//右ひざ下げる
	this.point[20].vVel.x = 2.3*this.speed * cc;
	this.point[20].vVel.y = 2.3*this.speed * ss;
	this.point[21].vVel = new Vector3();
	if(thetaDegL > this.theta1) this.mode = 2;
  }
  else if(this.mode == 2)
  {//右足固定，左足/右手出す
	this.point[14].flagFixed = false;
	this.point[15].flagFixed = true;
	this.point[14].vVel.x = 2.0*this.speed * cc;
	this.point[14].vVel.y = 2.0*this.speed * ss;
	this.point[12].vVel.x = 2.0*this.speed * cc;
	this.point[12].vVel.y = 2.0*this.speed * ss;
	this.point[12].vForce0.z = 200.0 * this.mass;//左ひざ上げる
	this.point[21].vVel.x = 2.3*this.speed * cc;
	this.point[21].vVel.y = 2.3*this.speed * ss;
	this.point[20].vVel = new Vector3();
	if(thetaDegR > this.theta1/2.0) this.mode = 3;
  }
  else if(this.mode == 3)
  {//右足固定，左足/右手出す
	this.point[14].flagFixed = false;
	this.point[15].flagFixed = true;
	this.point[14].vVel.x = 2.0*this.speed * cc;
	this.point[14].vVel.y = 2.0*this.speed * ss;
	this.point[12].vVel.x = 2.0*this.speed * cc;
	this.point[12].vVel.y = 2.0*this.speed * ss;
	this.point[12].vForce0.z = 0.0 * this.mass;//左ひざ下げる
	this.point[21].vVel.x = 2.3*this.speed * cc;
	this.point[21].vVel.y = 2.3*this.speed * ss;
	this.point[20].vVel = new Vector3();
	if(thetaDegR > this.theta1) this.mode = 0;
  }

  //進行方向が変化したときバネの方向ベクトル,質点の位置も変える
  var alpha = this.dir - this.dir0;
  if(alpha != 0.0)
  {
    //バネの方向
	for(i = 0; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
	//質点の座標
	for(i = 0; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
	this.dir0 = this.dir;
  }
  this.calcSpringMass(tt);
}

//-----------------------------------------------------------------------------
//1次元のバネマスモデル(方向バネも考慮，３次元空間で運動)
SpringMassAnimal.prototype.calcSpringMass = function(tt)
{                                           
  var i, j, r1, r2;
  var vDir1 = new Vector3();//hinge中心から#1へ向かう単位方向ベクトル(他にも使用)
  var vDir2 = new Vector3();//hinge中心から#2へ向かう単位方向ベクトル(他にも使用)
  var vFF = new Vector3();
  var vRelativeVel = new Vector3();
  var vNormal = new Vector3();
  var vG = new Vector3(0.0, 0.0, -gravity * this.mass);//重力ベクトル
  var dampingF, len, len1, len2, angle;
  var angle0 = Math.PI;
  var rad = this.radius;

  //力の初期値を重力だけとする
  for(i = 0; i  < this.numPoint; i++) this.point[i].vForce = add(this.point[i].vForce0, vG);

  //バネによる力
  for(i = 0; i < this.numSpring; i++)
  {
    //構造バネの弾性力
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    vDir1 = direction(this.point[r1].vPos , this.point[r2].vPos);//#1から#2への単位ベクトル
    len = distance(this.point[r1].vPos, this.point[r2].vPos);
    vFF = mul(this.constK * (len - this.spring[i].length0) , vDir1) ;
    this.point[r1].vForce.add(vFF) ;//vDirと同方向
    this.point[r2].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVel = sub(this.point[r1].vVel , this.point[r2].vVel);
    dampingF = this.damping * dot(vRelativeVel, vDir1);
    this.point[r1].vForce.sub(mul(dampingF , vDir1));//相対速度とは反対方向
    this.point[r2].vForce.add(mul(dampingF , vDir1));//同方向

    //方向バネを考慮 
    vDir1 = direction(this.point[r1].vPos, this.point[r2].vPos);
    vNormal = cross(this.spring[i].vDir0, vDir1);
	vDir2 = cross(vNormal, vDir1);
	angle = getAngle_rad(this.spring[i].vDir0, vDir1);
    vFF = mul(this.drctnK * angle / len, vDir2);
    this.point[r2].vForce.sub(vFF) ;
    this.point[r1].vForce.add(vFF);//vDir2と同方向
  }

  //粘性抵抗,床面処理,数値計算
  for(i = 0; i < this.numPoint; i++)
  {
    if(this.point[i].flagFixed) continue;
    //空気粘性抵抗（全ての質点に一様と仮定)
    this.point[i].vForce.sub(mul(this.drag, this.point[i].vVel));
    //床面処理
    if(this.point[i].vPos.z < rad)
    {
      //床面上に制限
      this.point[i].vPos.z = rad;
    }
    //Euler法
    //加速度
    var vAcc = div(this.point[i].vForce , this.mass);
    //速度
    this.point[i].vVel.add(mul(vAcc, tt));
    //位置
    this.point[i].vPos.add(mul(this.point[i].vVel, tt));
  }
  this.vPos = this.point[0].vPos;
  
}







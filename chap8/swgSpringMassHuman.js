/*----------------------------------------------
  swgSpringMassHuman.js
  ヒト型のバネ質点モデル
-----------------------------------------------*/
var gravity = 9.8;

function SpringMassHuman()
{
  this.type = 1;//簡易モデル、精密モデル
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
  this.theta2 = -10;//後傾角
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
SpringMassHuman.prototype.create = function()
{
  var len = this.length0;
  var wid1 = 0.2 * len;//腰
  var wid2 = 0.3 * len;//肩
  var rad = this.radius;
  //質点のサイズ,質量
  for(var i = 0; i < 15; i++)
  {
    this.point[i] = new Rigid();
    this.point[i].kind = "SPHERE";
	this.point[i].mass = this.mass;
    this.point[i].vSize = mul(new Vector3(rad, rad, rad), 2);
    //頭部を大きく
    if(this.type == 1 && i == 6) this.point[i].vSize = mul(new Vector3(rad, rad, rad), 4);
    if(this.type == 2 && i == 8) this.point[i].vSize = mul(new Vector3(rad, rad, rad), 4);
  }
  //バネ
  for(var i = 0; i < 14; i++)
  {
    this.spring[i] = new Rigid();
    this.spring[i].kind = "CYLINDER"; 
	this.spring[i].radius = rad;
	this.spring[i].radiusRatio = 1;
  }

  if(this.type == 1)//簡易モデル
  {
    this.numSpring = 10;
	this.numPoint = 11;
	this.rootNo = 4;
	//左足
	this.point[0].vPos = add(new Vector3(-wid1, 0.0, rad), this.vPos);
	//右足
	this.point[1].vPos = add(new Vector3( wid1, 0.0, rad), this.vPos);
	//左腰
	this.point[2].vPos = add(new Vector3(-wid1, 0.0, rad + len), this.vPos);
	//右腰
	this.point[3].vPos = add(new Vector3( wid1, 0.0, rad + len), this.vPos);
	//root（上の中心質点）
	this.point[4].vPos = add(new Vector3( 0.0, 0.0, rad + len), this.vPos);
	//首,頭
	this.point[5].vPos = add(new Vector3( 0.0, 0.0, rad + 1.9*len), this.vPos);
	this.point[6].vPos = add(new Vector3( 0.0, 0.0, rad + 2.3*len) , this.vPos);
	//肩
	this.point[7].vPos = add(new Vector3(-wid2, 0.0, rad + 1.9*len), this.vPos);
	this.point[8].vPos = add(new Vector3( wid2, 0.0, rad + 1.9*len), this.vPos);
	//手
	this.point[9].vPos =  add(new Vector3(-wid2, 0.0, rad + len * 0.9), this.vPos);
	this.point[10].vPos = add(new Vector3( wid2, 0.0, rad + len * 0.9), this.vPos);
	//左脚(spring)
    this.spring[0].row1 = 0; this.spring[0].row2 = 2;
	//右脚(spring)
    this.spring[1].row1 = 1; this.spring[1].row2 = 3;
	//左腰(spring)
    this.spring[2].row1 = 2; this.spring[2].row2 = 4;
	//左腰(spring)
    this.spring[3].row1 = 4; this.spring[3].row2 = 3;	
	//spring
	//脚(spring)
	this.spring[0].row1 = 0; this.spring[0].row2 = 2;//左脚
	this.spring[1].row1 = 1; this.spring[1].row2 = 3;//右脚
	//腰(spring)
	this.spring[2].row1 = 2; this.spring[2].row2 = 4;//左腰
	this.spring[3].row1 = 4; this.spring[3].row2 = 3;//右腰
	//胴体（背骨）
	this.spring[4].row1 = 4; this.spring[4].row2 = 5;
	//首
	this.spring[5].row1 = 5; this.spring[5].row2 = 6;
	//鎖骨
	this.spring[6].row1 = 7; this.spring[6].row2 = 5;
	this.spring[7].row1 = 5; this.spring[7].row2 = 8;
	//腕
	this.spring[8].row1 = 7; this.spring[8].row2 = 9;
	this.spring[9].row1 = 8; this.spring[9].row2 = 10;
  }
  else if(this.type == 2)
  {
    this.numSpring = 14;
	this.numPoint = 15;
	this.rootNo = 6;
	//point
	//足
	this.point[0].vPos = add(new Vector3(-wid1, 0.0, rad), this.vPos);//左足
	this.point[1].vPos = add(new Vector3( wid1, 0.0, rad), this.vPos);//右足
	//膝
	this.point[2].vPos = add(new Vector3(-wid1, 0.0, rad + len/2.0), this.vPos);//左
	this.point[3].vPos = add(new Vector3( wid1, 0.0, rad + len/2.0), this.vPos);//右
	//腰
	this.point[4].vPos = add(new Vector3(-wid1, 0.0, rad + len), this.vPos);//左腰
	this.point[5].vPos = add(new Vector3( wid1, 0.0, rad + len), this.vPos);//右腰
	//重心（root）
	this.point[6].vPos = add(new Vector3( 0.0, 0.0, rad + len), this.vPos);
	//首,頭
	this.point[7].vPos = add(new Vector3( 0.0, 0.0, rad + 2.0*len), this.vPos);
	this.point[8].vPos = add(new Vector3( 0.0, 0.0, rad + 2.4*len), this.vPos);
	//肩
	this.point[9].vPos  = add(new Vector3(-wid2, 0.0, rad + 2.0*len), this.vPos);
	this.point[10].vPos = add(new Vector3( wid2, 0.0, rad + 2.0*len), this.vPos);
	//肘
	this.point[11].vPos = add(new Vector3(-wid2, 0.0, rad + len * 1.6), this.vPos);
	this.point[12].vPos = add(new Vector3( wid2, 0.0, rad + len * 1.6), this.vPos);
	//手
	this.point[13].vPos = add(new Vector3(-wid2, 0.0, rad + len * 1.1), this.vPos);
	this.point[14].vPos = add(new Vector3( wid2, 0.0, rad + len * 1.1), this.vPos);
	//spring
	//脛(spring)
	this.spring[0].row1 = 0; this.spring[0].row2 = 2;//左
	this.spring[1].row1 = 1; this.spring[1].row2 = 3;//右
	//腿(spring)
	this.spring[2].row1 = 2; this.spring[2].row2 = 4;//左
	this.spring[3].row1 = 3; this.spring[3].row2 = 5;//右
	//腰(spring)
	this.spring[4].row1 = 4; this.spring[4].row2 = 6;//左腰
	this.spring[5].row1 = 6; this.spring[5].row2 = 5;//左腰
	//胴体（背骨）
	this.spring[6].row1 = 6; this.spring[6].row2 = 7;
	//首
	this.spring[7].row1 = 7; this.spring[7].row2 = 8;
	//鎖骨
	this.spring[8].row1 = 9; this.spring[8].row2 = 7;
	this.spring[9].row1 = 7; this.spring[9].row2 = 10;
	//上腕
	this.spring[10].row1 = 9;  this.spring[10].row2 = 11;
	this.spring[11].row1 = 10; this.spring[11].row2 = 12;
	//前腕
	this.spring[12].row1 = 11; this.spring[12].row2 = 13;
	this.spring[13].row1 = 12; this.spring[13].row2 = 14;	
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
	for(i = 0; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
  }
}

//-----------------------------------------------------------------
SpringMassHuman.prototype.draw = function(gl)
{
  var i, r1, r2;

  //ばね質点表示
  //質点
  var n = this.point[0].initVertexBuffers(gl);
  for(i = 0; i < this.numPoint; i++) 
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
SpringMassHuman.prototype.walk = function(tt)
{
  var i, theta, thetaDegL, thetaDegR, dist;
  var cc = Math.cos(this.dir);
  var ss = Math.sin(this.dir);
  var vDirection = new Vector3(cc, ss , 0.0);//進行方向のベクトル

  if(this.type == 1)//簡易モデル
  {
		
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
	{//左足を固定，右足出す,
	  this.point[0].flagFixed = true;
	  this.point[1].flagFixed = false;
	  this.point[1].vVel.x = 2.0 * this.speed * cc;
	  this.point[1].vVel.y = 2.0 * this.speed * ss;
	  this.point[9].vVel.x = 2.0 * this.speed * cc;
	  this.point[9].vVel.y = 2.0 * this.speed * ss;
	  this.point[10].vVel.x = 0.0;
	  this.point[10].vVel.y = 0.0;

	  if(thetaDegL > this.theta1) this.mode = 1;
	}
	else if(this.mode == 1)
	{//右足固定，左足出す
	  this.point[0].flagFixed = false;
	  this.point[1].flagFixed = true;
	  this.point[0].vVel.x = 2.0 * this.speed * cc;
	  this.point[0].vVel.y = 2.0 * this.speed * ss;
	  this.point[10].vVel.x = 2.0 * this.speed * cc;
	  this.point[10].vVel.y = 2.0 * this.speed * ss;
	  this.point[9].vVel.x = 0.0;
	  this.point[9].vVel.y = 0.0;
	  if(thetaDegR > this.theta1) this.mode = 0;
	}
  }
  else if(this.type == 2 )
  {
	//左脚の水平方向距離（符号付き）
	dist = dot(sub(this.point[4].vPos, this.point[0].vPos), vDirection);
	//左脚の角度
	theta = Math.atan2(dist, this.point[4].vPos.z - this.point[0].vPos.z); 
	thetaDegL = theta * RAD_TO_DEG;
	//右脚の水平方向距離（符号付き）
	dist = dot(sub(this.point[5].vPos, this.point[1].vPos), vDirection);
	//右脚の角度
	theta = Math.atan2(dist, this.point[5].vPos.z - this.point[1].vPos.z); 
	thetaDegR = theta * RAD_TO_DEG;

	for(i = 4; i < this.numPoint; i++)
	{
	  this.point[i].vVel.x = this.speed * cc;
	  this.point[i].vVel.y = this.speed * ss;
	}

	if(this.mode == 0)
	{//左足を固定，右足/左手出す,
	  this.point[0].vPos.z = this.radius;//地面に付ける
	  this.point[0].flagFixed = true;
	  this.point[1].flagFixed = false;
	  this.point[1].vVel.x = 2.0 * this.speed * cc;
	  this.point[1].vVel.y = 2.0 * this.speed * ss;
	  this.point[3].vVel.x = 2.0 * this.speed * cc;
	  this.point[3].vVel.y = 2.0 * this.speed * ss;
	  this.point[3].vForce0.z = 150.0 * this.mass;//右ひざ
	  this.point[13].vVel.x = 2.3 * this.speed * cc;
	  this.point[13].vVel.y = 2.3 * this.speed * ss;
	  this.point[14].vVel = new Vector3();
	  if(thetaDegL > this.theta1 * 0.8) this.mode = 1;
	}
	else if(this.mode ==1)
	{
		this.point[0].vPos.z = this.radius;//地面に付ける
		this.point[0].flagFixed = true;
		this.point[1].flagFixed = false;
		this.point[1].vVel.x = 2.0 * this.speed * cc;
		this.point[1].vVel.y = 2.0 * this.speed * ss;
		this.point[3].vVel.x = 2.0 * this.speed * cc;
		this.point[3].vVel.y = 2.0 * this.speed * ss;
		this.point[3].vForce0.z = 0.0;
		this.point[13].vVel.x = 2.3 * this.speed * cc;
		this.point[13].vVel.y = 2.3 * this.speed * ss;
		this.point[14].vVel = new Vector3();
		if(thetaDegL > this.theta1) this.mode = 2;
	}

	else if(this.mode == 2)
	{//右足固定，左足/右手出す
		this.point[1].vPos.z = this.radius;
		this.point[0].flagFixed = false;
		this.point[1].flagFixed = true;
		this.point[0].vVel.x = 2.0 * this.speed * cc;
		this.point[0].vVel.y = 2.0 * this.speed * ss;
		this.point[2].vVel.x = 2.0 * this.speed * cc;
        this.point[2].vVel.y = 2.0 * this.speed * ss;
		this.point[2].vForce0.z = 150.0 * this.mass;//左膝
		this.point[14].vVel.x = 2.3*this.speed * cc;
		this.point[14].vVel.y = 2.3*this.speed * ss;
		this.point[13].vVel = new Vector3();
		if(thetaDegR > this.theta1 * 0.8) this.mode = 3;
	}
	else if(this.mode == 3)
	{
		this.point[1].vPos.z = this.radius;//地面に付ける
		this.point[0].flagFixed = false;
		this.point[1].flagFixed = true;
		this.point[0].vVel.x = 2.0 * this.speed * cc;
		this.point[0].vVel.y = 2.0 * this.speed * ss;
		this.point[2].vVel.x = 2.0 * this.speed * cc;
		this.point[2].vVel.y = 2.0 * this.speed * ss;
		this.point[2].vForce0.z = 0.0;
		this.point[14].vVel.x = 2.3*this.speed * cc;
		this.point[14].vVel.y = 2.3*this.speed * ss;
		this.point[13].vVel = new Vector3();
		if(thetaDegR > this.theta1) this.mode = 0;
	}
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
SpringMassHuman.prototype.calcSpringMass = function(tt)
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







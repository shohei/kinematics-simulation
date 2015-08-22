/*----------------------------------------------
  swgSpringMassVehicle.js
  仮想乗り物のバネ質点モデル
-----------------------------------------------*/
var gravity = 9.8;

function SpringMassVehicle()
{
  this.type = 0;//4足動物、昆虫型、恐竜型
  this.numSpring = 1;
  this.numPoint = this.numSpring + 1;
  this.numDiv = 8;//車輪円周上の分割数
  this.mass = 0.1;//質点１個当たりの質量(kg)
  this.constK = 200;//構造バネ1個当たりのバネ定数
  this.drctnK = 20;//方向バネ
  this.damping = 0.1;//0.5;
  this.drag = 0.1;

  this.length0 = 1;//脚バネの自然長
  this.radius = 0.08 ;//バネの半径
  this.dir;//進行方向（x軸からの偏角）
  this.dir0;//バネの初期設定方向
  this.ang = this.ang0 = Math.PI / 2;//後輪
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
SpringMassVehicle.prototype.create = function()
{
  var len = this.length0;
  var rad = this.radius;
  var i, k, n1, n2;
  
  //4輪車の質点、スプリングの個数でRigidクラスのインスタンスを作成
  this.numSpring = 8 * this.numDiv + 12;
  this.numPoint = 4 * this.numDiv + 9;
  //質点のサイズ,質量
  for(i = 0; i < this.numPoint; i++)
  {
    this.point[i] = new Rigid();
    this.point[i].kind = "SPHERE";
    this.point[i].vSize = mul(new Vector3(2.0, 2.0, 2.0), rad);
    this.point[i].vVel = new Vector3();
    this.point[i].vForce0 = new Vector3();
	this.point[i].mass = this.mass;
  }
  //バネ
  for(i = 0; i < this.numSpring; i++)
  {
    this.spring[i] = new Rigid();
    this.spring[i].kind = "CYLINDER"; 
	this.spring[i].radius = rad;
	this.spring[i].radiusRatio = 1;
  }
  

  if(this.type == 0)
  {//一輪車
    this.numSpring = 2 * this.numDiv;
	this.numPoint = this.numDiv + 1;//中心を含む
	this.rootNo = 0;

	//point
	//中心(root)
	this.point[0].vPos.copy(this.vPos);
	//円周上
	for(i = 1; i <= this.numDiv; i++)
	{
	  var phi = 2.0 * Math.PI * (i - 1) / this.numDiv;
	  this.point[i].vPos.x = 0.0;
	  this.point[i].vPos.y = len * Math.cos(phi);
	  this.point[i].vPos.z = len * Math.sin(phi);
	  this.point[i].vPos.add(this.vPos);
	}
	//spring
	for(i = 0; i < this.numDiv; i++)
	{//spoke(輻）
	  this.spring[i].row1 = 0; 
	  this.spring[i].row2 = i + 1;
	}
	for(i = 0; i < this.numDiv; i++)
	{//車輪円周上
	  this.spring[i + this.numDiv].row1 = i + 1; 
	  if(i < this.numDiv-1) this.spring[i + this.numDiv].row2 = i + 2;
	  else                  this.spring[i + this.numDiv].row2 = 1;
	}
  }
  else if(this.type == 1)
  {//二輪車
	this.numSpring = 4 * this.numDiv + 16;
	this.numPoint = 2 * this.numDiv + 11;
	var Length = 3.0 * len ;//前輪と後輪の間隔
	this.rootNo = this.numDiv*2+10;//サドルの中心
    //point
	//前輪の中心
	this.point[0].vPos = add(new Vector3(0.0, Length/2.0, 0.0), this.vPos);//基本姿勢ではx軸を中心軸とする
	for(i = 1; i <= this.numDiv; i++)
	{//前輪円周上
	  var phi = 2.0 * Math.PI * (i - 1) / this.numDiv;
	  this.point[i].vPos.x = 0.0;
	  this.point[i].vPos.y = len * Math.cos(phi) + Length / 2.0;
	  this.point[i].vPos.z = len * Math.sin(phi);
	  this.point[i].vPos.add(this.vPos);
	}
	//spring
	for(i = 0; i < this.numDiv; i++)
	{//spoke(輻）
	  this.spring[i].row1 = 0; 
	  this.spring[i].row2 = i + 1;
	}
		
	for(i = 0; i < this.numDiv; i++)
	{//車輪円周上
	  k = this.numDiv + i;
	  this.spring[k].row1 = i + 1; 
	  if(i < this.numDiv-1) this.spring[k].row2 = i + 2;
	  else		            this.spring[k].row2 = 1;
	}	
	//point
	//後輪の中心
	this.point[this.numDiv+1].vPos = add(new Vector3(0.0, -Length/2.0, 0.0), this.vPos);//基本姿勢ではx軸を中心軸とする
	for(i = 1; i <= this.numDiv; i++)
	{//後輪円周上
	  k = this.numDiv + i + 1;
	  var phi = 2.0 * Math.PI * (i - 1) / this.numDiv;
	  this.point[k].vPos.x = 0.0;
	  this.point[k].vPos.y = len * Math.cos(phi) - Length / 2.0;
	  this.point[k].vPos.z = len * Math.sin(phi);
	  this.point[k].vPos.add(this.vPos);
	}
	//spring
	for(i = 0; i < this.numDiv; i++)
	{//spoke(輻）
	  k = 2 * this.numDiv + i;
	  this.spring[k].row1 = this.numDiv + 1; 
	  this.spring[k].row2 = this.numDiv + i + 2;
 	}
	for(i = 0; i < this.numDiv; i++)
	{//後輪円周上
	  k = 3 * this.numDiv + i;
	  this.spring[k].row1 = this.numDiv + i + 2; 
	  if(i < this.numDiv-1)	this.spring[k].row2 = this.numDiv + i + 3;
	  else		            this.spring[k].row2 = this.numDiv + 2;
	}
	//車軸
	var wid = len ;//車軸の長さ(幅）
	this.point[this.numDiv*2+2].vPos = add(new Vector3(-wid/2.0, Length/2.0, 0.0), this.vPos);//前左 
	this.point[this.numDiv*2+3].vPos = add(new Vector3( wid/2.0, Length/2.0, 0.0), this.vPos);//前右
	this.point[this.numDiv*2+4].vPos = add(new Vector3(-wid/2.0,-Length/2.0, 0.0), this.vPos);//後左 
	this.point[this.numDiv*2+5].vPos = add(new Vector3( wid/2.0,-Length/2.0, 0.0), this.vPos);//後右
	this.spring[this.numDiv * 4].row1 = 0    ; this.spring[this.numDiv * 4].row2 = this.numDiv*2 + 2;//前左 
	this.spring[this.numDiv * 4 + 1].row1 = 0; this.spring[this.numDiv * 4 + 1].row2 = this.numDiv*2 + 3;//前右 
	this.spring[this.numDiv * 4 + 2].row1 = this.numDiv+1; this.spring[this.numDiv * 4 + 2].row2 = this.numDiv*2 + 4;//後左 
	this.spring[this.numDiv * 4 + 3].row1 = this.numDiv+1; this.spring[this.numDiv * 4 + 3].row2 = this.numDiv*2 + 5;//後右 
	//サドル
	this.point[this.numDiv*2+6].vPos = add(new Vector3(-wid/2.0, wid, len*1.5), this.vPos);//前左
	this.point[this.numDiv*2+7].vPos = add(new Vector3( wid/2.0, wid, len*1.5), this.vPos);//前右
	this.point[this.numDiv*2+8].vPos = add(new Vector3(-wid/2.0,-wid, len*1.5), this.vPos);//後左
	this.point[this.numDiv*2+9].vPos = add(new Vector3( wid/2.0,-wid, len*1.5), this.vPos);//後右
    this.spring[this.numDiv*4+4].row1 = this.numDiv*2+6;  this.spring[this.numDiv*4+4].row2 = this.numDiv*2+7;
    this.spring[this.numDiv*4+5].row1 = this.numDiv*2+8;  this.spring[this.numDiv*4+5].row2 = this.numDiv*2+9;
    this.spring[this.numDiv*4+6].row1 = this.numDiv*2+6;  this.spring[this.numDiv*4+6].row2 = this.numDiv*2+8;
    this.spring[this.numDiv*4+7].row1 = this.numDiv*2+7;  this.spring[this.numDiv*4+7].row2 = this.numDiv*2+9;
    //サドルの4隅と車軸の端の質点を結合
    this.spring[this.numDiv*4+8].row1 = this.numDiv*2+6;   this.spring[this.numDiv*4+8].row2 = this.numDiv*2+2;
    this.spring[this.numDiv*4+9].row1 = this.numDiv*2+7;   this.spring[this.numDiv*4+9].row2 = this.numDiv*2+3;
    this.spring[this.numDiv*4+10].row1 = this.numDiv*2+8;  this.spring[this.numDiv*4+10].row2 = this.numDiv*2+4;
    this.spring[this.numDiv*4+11].row1 = this.numDiv*2+9;  this.spring[this.numDiv*4+11].row2 = this.numDiv*2+5;
	//サドルの中心
	this.point[this.numDiv*2+10].vPos = add(new Vector3(0.0, 0.0, len * 1.5), this.vPos);
	this.spring[this.numDiv*4+12].row1 = this.rootNo; this.spring[this.numDiv*4+12].row2 = this.numDiv*2+6;
	this.spring[this.numDiv*4+13].row1 = this.rootNo; this.spring[this.numDiv*4+13].row2 = this.numDiv*2+7;
	this.spring[this.numDiv*4+14].row1 = this.rootNo; this.spring[this.numDiv*4+14].row2 = this.numDiv*2+8;
	this.spring[this.numDiv*4+15].row1 = this.rootNo; this.spring[this.numDiv*4+15].row2 = this.numDiv*2+9;
  }

  else if(this.type == 2)
  {//四輪車
	this.numSpring = 8 * this.numDiv + 12;
	this.numPoint = 4 * this.numDiv + 9;
	var Length = 3.0 * len;
	var wid = 2.0 * len;//全体の幅
	var wid0 = wid / 2;

	//前輪左の中心
	this.point[0].vPos = add(new Vector3(-wid/2.0, Length/2.0, 0.0), this.vPos);//基本姿勢ではx軸を中心軸とする
	for(i = 1; i <= this.numDiv; i++)
	{//前輪円周上
	  var phi = 2.0 * Math.PI * (i - 1) / this.numDiv;
	  this.point[i].vPos.x = -wid /2.0;
	  this.point[i].vPos.y = len *Math. cos(phi) + Length / 2.0;
	  this.point[i].vPos.z = len * Math.sin(phi);
	  this.point[i].vPos.add(this.vPos);
	}
	//spring
	for(i = 0; i < this.numDiv; i++)
	{//spoke(輻）
	  this.spring[i].row1 = 0; 
	  this.spring[i].row2 = i + 1;
	}
	for(i = 0; i < this.numDiv; i++)
	{//前輪円周上 
	  k = this.numDiv + i;
	  this.spring[k].row1 = i + 1; 
	  if(i < this.numDiv-1) this.spring[k].row2 = i + 2;
	  else                  this.spring[k].row2 = 1;
	}
	//前輪右の中心
	this.point[this.numDiv+1].vPos = add(new Vector3( wid/2.0,  Length/2.0, 0.0), this.vPos);//基本姿勢ではx軸を中心軸とする
		
	for(i = 1; i <= this.numDiv; i++)
	{//前輪右円周上
	  k = this.numDiv + i + 1;
	  var phi = 2.0 * Math.PI * (i - 1) / this.numDiv;
	  this.point[k].vPos.x = wid / 2.0;
	  this.point[k].vPos.y = len * Math.cos(phi) + Length / 2.0;
	  this.point[k].vPos.z = len * Math.sin(phi);
	  this.point[k].vPos.add(this.vPos);
	}
	//spring
	for(i = 0; i < this.numDiv; i++)
	{//spoke(輻）
	  k = 2 * this.numDiv + i;
	  this.spring[k].row1 = this.numDiv + 1; 
	  this.spring[k].row2 = this.numDiv + i + 2;
	}
	for(i = 0; i < this.numDiv; i++)
	{//車輪円周上
	  k = 3 * this.numDiv + i;
	  this.spring[k].row1 = this.numDiv + i + 2; 
	  if(i < this.numDiv-1) this.spring[k].row2 = this.numDiv + i + 3;
	  else      			this.spring[k].row2 = this.numDiv + 2;
	}
	//後輪左の中心
	this.point[2*this.numDiv+2].vPos = add(new Vector3(-wid/2.0, -Length/2.0, 0.0), this.vPos);//基本姿勢ではx軸を中心軸とする
	for(i = 1; i <= this.numDiv; i++)
	{//円周上
	  k = 2*this.numDiv + i + 2;
	  var phi = 2.0 * Math.PI * (i - 1) / this.numDiv;
	  this.point[k].vPos.x = -wid / 2.0;
	  this.point[k].vPos.y = len * Math.cos(phi) - Length / 2.0;
	  this.point[k].vPos.z = len * Math.sin(phi);
	  this.point[k].vPos.add(this.vPos);
	}
	//spring
	for(i = 0; i < this.numDiv; i++)
	{//spoke(輻）
	  k = 4 * this.numDiv + i;
	  this.spring[k].row1 = 2 * this.numDiv + 2; 
	  this.spring[k].row2 = 2 * this.numDiv + i + 3;
	}
	for(i = 0; i < this.numDiv; i++)
	{//後輪左円周上
	  k = 5 * this.numDiv + i;
	  this.spring[k].row1 = 2*this.numDiv + i + 3; 
	  if(i < this.numDiv-1) this.spring[k].row2 = 2*this.numDiv + i + 4;
	  else			        this.spring[k].row2 = 2*this.numDiv + 3;
	}
	//後輪右の中心
	this.point[3*this.numDiv+3].vPos = add(new Vector3(wid/2.0, -Length/2.0, 0.0), this.vPos);//基本姿勢ではx軸を中心軸とする
	for(i = 1; i <= this.numDiv; i++)
	{//円周上
	  k = 3*this.numDiv + i + 3;
	  var phi = 2.0 * Math.PI * (i - 1) / this.numDiv;
	  this.point[k].vPos.x =  wid / 2.0;
	  this.point[k].vPos.y = len * Math.cos(phi) - Length / 2.0;
	  this.point[k].vPos.z = len * Math.sin(phi);
	  this.point[k].vPos.add(this.vPos);
	}
	//spring
	for(i = 0; i < this.numDiv; i++)
	{//spoke(輻）
	  k = 6 * this.numDiv + i;
	  this.spring[k].row1 = 3*this.numDiv + 3; 
	  this.spring[k].row2 = 3*this.numDiv + i + 4;
	}
	for(i = 0; i < this.numDiv; i++)
	{//車輪円周上
	  k = 7 * this.numDiv + i;
	  this.spring[k].row1 = 3*this.numDiv + i + 4; 
	  if(i < this.numDiv-1)	this.spring[k].row2 = 3*this.numDiv + i + 5;
	  else			        this.spring[k].row2 = 3*this.numDiv + 4;
	}
	var k0 = 4 * this.numDiv + 4;//これまでの質点数
	//台のpoint
	this.point[k0 + 0].vPos = add(new Vector3(-wid0/2.0, Length/2.0, 0.0), this.vPos);//前左 
	this.point[k0 + 1].vPos = add(new Vector3( wid0/2.0, Length/2.0, 0.0), this.vPos);//前右
	this.point[k0 + 2].vPos = add(new Vector3(-wid0/2.0,-Length/2.0, 0.0), this.vPos);//後左 
	this.point[k0 + 3].vPos = add(new Vector3( wid0/2.0,-Length/2.0, 0.0), this.vPos);//後右
	//台の中心(root)
	this.point[k0 + 4].vPos = add(new Vector3(0.0, 0.0, 0.0), this.vPos);
	this.rootNo = k0 + 4;
	//spring
	var n0 = this.numDiv * 8;//これまでのバネ個数
	this.spring[n0 + 0].row1 = 0 ; this.spring[n0 + 0].row2 = k0;
	this.spring[n0 + 1].row1 = k0; this.spring[n0 + 1].row2 = k0 + 1; 
	this.spring[n0 + 2].row1 = k0 + 1; this.spring[n0 + 2].row2 = this.numDiv + 1;
	this.spring[n0 + 3].row1 = 2*this.numDiv+2; this.spring[n0 + 3].row2 = k0 + 2;
    this.spring[n0 + 4].row1 = k0 + 2;  this.spring[n0 + 4].row2 = k0 + 3;
    this.spring[n0 + 5].row1 = k0 + 3;  this.spring[n0 + 5].row2 = 3*this.numDiv+3;
    this.spring[n0 + 6].row1 = this.rootNo;  this.spring[n0 + 6].row2 = k0;
    this.spring[n0 + 7].row1 = this.rootNo;  this.spring[n0 + 7].row2 = k0 + 1;
    this.spring[n0 + 8].row1 = this.rootNo;  this.spring[n0 + 8].row2 = k0 + 2;
    this.spring[n0 + 9].row1 = this.rootNo;  this.spring[n0 + 9].row2 = k0 + 3;
    this.spring[n0 + 10].row1 = k0;  this.spring[n0 + 10].row2 = k0 + 2;
    this.spring[n0 + 11].row1 = k0 + 1;  this.spring[n0 + 11].row2 = k0 + 3;
  }
  
  //バネの自然長と方向ベクトル
  var n1, n2;
  for(i = 0; i < this.numSpring; i++)
  {
	n1 = this.spring[i].row1; n2 = this.spring[i].row2;
	this.spring[i].length0 = distance(this.point[n1].vPos, this.point[n2].vPos);
	this.spring[i].vDir0 = direction(this.point[n1].vPos, this.point[n2].vPos);
  }
  //進行方向初期値がy軸方向でないとき質点の位置/バネの方向ベクトルも変える
  var alpha = this.dir0 - Math.PI/2.0;
  if(alpha != 0.0)
  {
    for(i = 0; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
	//質点の座標
	for(i = 0; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
  }
}

//-----------------------------------------------------------------
SpringMassVehicle.prototype.draw = function(gl)
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
SpringMassVehicle.prototype.move0 = function(tt)
{
  var i;
  var omega = this.speed / this.length0;//車輪の回転速度
  var cc = Math.cos(this.dir);
  var ss = Math.sin(this.dir);

  var theta = -omega * tt;//-x軸回転(基本姿勢, rad単位）
  this.point[this.rootNo].vVel.y = this.speed * ss;
  this.point[this.rootNo].vVel.x = this.speed * cc;

  //車の回転，進行方向が変化したとき質点の位置/バネの方向ベクトルも変える
  var alpha = this.dir - this.dir0;//[rad]
  for(i = 0; i < this.numSpring; i++)
  {//バネの基準方向
 	this.spring[i].vDir0.rotX_rad( theta * ss);
	this.spring[i].vDir0.rotY_rad(-theta * cc);
	this.spring[i].vDir0.rotZ_rad( alpha);
  }
  for(i = 0; i < this.numPoint; i++)
  {//質点位置座標
	this.point[i].vPos.rotX_radC(this.point[this.rootNo].vPos, theta);//x軸回転
	this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);//z軸回転
  }
  this.dir0 = this.dir;
	
  this.calcSpringMass(tt);
}

//-------------------------------------------------------------------
SpringMassVehicle.prototype.move1 = function(tt)
{
  var i;
  var center1 = 0;//前輪の中心点
  var center2 = this.numDiv+1;
  var omega = this.speed / this.length0;//車輪の回転速度
  var cc = Math.cos(this.dir);
  var ss = Math.sin(this.dir);

  var theta = -omega * tt;//-x軸回転(基本姿勢）
  this.point[center1].vVel.y = this.speed * ss;
  this.point[center1].vVel.x = this.speed * cc;
  this.point[center2].vVel.y = this.speed * Math.sin(this.ang);
  this.point[center2].vVel.x = this.speed * Math.cos(this.ang);

  //車の回転，進行方向が変化したとき質点の位置/バネの基準方向ベクトルも変える
  //前輪
  var alpha = this.dir - this.dir0;//rad
  for(i = 0; i < 2*this.numDiv; i++)
  {//バネの方向
	this.spring[i].vDir0.rotX_rad( theta * ss);
	this.spring[i].vDir0.rotY_rad(-theta * cc);
	this.spring[i].vDir0.rotZ_rad( alpha);
  }

  for(i = 0; i <= this.numDiv; i++)
  {//質点の座標
	this.point[i].vPos.rotX_radC(this.point[center1].vPos, theta);//x軸回転
	this.point[i].vPos.rotZ_radC(this.point[center1].vPos, alpha);//z軸回転
  }
  this.dir0 = this.dir;
	
  //後輪の進行方向(rad)
  this.ang = Math.atan2( this.point[center1].vPos.y - this.point[center2].vPos.y, 
                         this.point[center1].vPos.x - this.point[center2].vPos.x);
  alpha = this.ang - this.ang0;//変化分

  for(i = 2*this.numDiv; i < 4*this.numDiv; i++)
	{
		this.spring[i].vDir0.rotX_rad( theta * Math.sin(this.ang));
		this.spring[i].vDir0.rotY_rad(-theta * Math.cos(this.ang));
		this.spring[i].vDir0.rotZ_rad( alpha);
	}

	for(i = this.numDiv+1; i <= 2*this.numDiv+1; i++)
	{
		this.point[i].vPos.rotX_radC(this.point[center2].vPos, theta);//x軸回転
		this.point[i].vPos.rotZ_radC(this.point[center2].vPos, alpha);//z軸回転
	}
	this.ang0 = this.ang;

	//他の質点，バネはrootNoを中心に後輪と同じ向きに回転
	if(alpha != 0.0)
	{
		for(i = 4*this.numDiv; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
		for(i = 2*this.numDiv+2; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
	}

  this.calcSpringMass(tt);
}
//-------------------------------------------------------------------
SpringMassVehicle.prototype.move2 = function(tt)
{
  var i;
  var center1 = 0;//前輪左の中心点
  var center2 = this.numDiv+1;//前輪右の中心点
  var center3 = this.numDiv*2+2;//後輪左の中心点
  var center4 = this.numDiv*3+3;//後輪右の中心点
  var omega = this.speed / this.length0;//車輪の回転速度
  var cc = Math.cos(this.dir);
  var ss = Math.sin(this.dir);

  var theta = -omega * tt;//-x軸回転(基本姿勢）
  this.point[center1].vVel.x = this.speed * cc;
  this.point[center1].vVel.y = this.speed * ss;
  this.point[center2].vVel.x = this.speed * cc;
  this.point[center2].vVel.y = this.speed * ss;
		
  //後輪の進行方向(台の方向）
  this.ang = Math.atan2( this.point[center1].vPos.y - this.point[center3].vPos.y, 
                         this.point[center1].vPos.x - this.point[center3].vPos.x);
	this.point[center3].vVel.x = this.speed * Math.cos(this.ang);
	this.point[center3].vVel.y = this.speed * Math.sin(this.ang);
	this.point[center4].vVel.x = this.speed * Math.cos(this.ang);
	this.point[center4].vVel.y = this.speed * Math.sin(this.ang);
	
	//車の回転，進行方向が変化したとき質点の位置/バネの基準方向ベクトルも変える
	var x, y, z, alpha;
	//前輪
	alpha = this.dir - this.dir0;

	for(i = 0; i < 4*this.numDiv; i++)
	{
		this.spring[i].vDir0.rotX_rad( theta * ss);
		this.spring[i].vDir0.rotY_rad(-theta * cc);
		this.spring[i].vDir0.rotZ_rad( alpha);
	}
	this.dir0 = this.dir;

	//前輪左の質点
	for(i = 0; i <= this.numDiv; i++)
	{
		this.point[i].vPos.rotX_radC(this.point[center1].vPos, theta);//x軸回転
		this.point[i].vPos.rotZ_radC(this.point[center1].vPos, alpha);//z軸回転
	}
	//前輪右の質点
	for(i = this.numDiv + 1; i <= 2*this.numDiv+1; i++)
	{
		this.point[i].vPos.rotX_radC(this.point[center2].vPos, theta);//x軸回転
		this.point[i].vPos.rotZ_radC(this.point[center2].vPos, alpha);//z軸回転
	}
	
	
	alpha = this.ang - this.ang0;

	for(i = 4*this.numDiv; i < 8*this.numDiv; i++)
	{
		this.spring[i].vDir0.rotX_rad( theta * Math.sin(this.ang));
		this.spring[i].vDir0.rotY_rad(-theta * Math.cos(this.ang));
		this.spring[i].vDir0.rotZ_rad( alpha);
	}
	this.ang0 = this.ang;

	//後輪左
	for(i = 2*this.numDiv+2; i <= 3*this.numDiv+2; i++)
	{
		this.point[i].vPos.rotX_radC(this.point[center3].vPos, theta);//x軸回転
		this.point[i].vPos.rotZ_radC(this.point[center3].vPos, alpha);//z軸回転
	}
	//後輪右
	for(i = 3*this.numDiv+3; i <= 4*this.numDiv+3; i++)
	{
		this.point[i].vPos.rotX_radC(this.point[center4].vPos, theta);//x軸回転
		this.point[i].vPos.rotZ_radC(this.point[center4].vPos, alpha);//z軸回転
	}

	//他の質点，バネはrootNoを中心に回転
	if(alpha != 0.0)
	{
		for(i = 8*this.numDiv; i < this.numSpring; i++) this.spring[i].vDir0.rotZ_rad(alpha);
		for(i = 4*this.numDiv+4; i < this.numPoint; i++) this.point[i].vPos.rotZ_radC(this.point[this.rootNo].vPos, alpha);
	}

  this.calcSpringMass(tt);
}

//-----------------------------------------------------------------------------
//1次元のバネマスモデル(方向バネも考慮，３次元空間で運動)
SpringMassVehicle.prototype.calcSpringMass = function(tt)
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
  var restitution = 0.2;//跳ね返り係数
  var muK = 0.9; 
  //力の初期値を重力だけとする
  for(i = 0; i  < this.numPoint; i++) this.point[i].vForce.copy(vG);
    
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
      //床との衝突
      if(this.point[i].vVel.z < 0.0){ //質点と床面とは弾性衝突とする
         this.point[i].vVel.z = - restitution * this.point[i].vVel.z ;
      }
    }

    //Euler法
    //加速度
    var vAcc = div(this.point[i].vForce , this.mass);
    //速度
    this.point[i].vVel.add(mul(vAcc, tt));
    //位置
    this.point[i].vPos.add(mul(this.point[i].vVel, tt));
  }
  this.vPos = this.point[this.rootNo].vPos;
}







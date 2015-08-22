/*----------------------------------------------------------------------------
   階層構造用Rigidクラス
----------------------------------------------------------------------------*/
function Rigid_HS()
{
  //プロパティ
  this.kind = "CUBE";
  this.diffuse = [0.6, 0.6, 0.6, 1.0];
  this.ambient = [0.4, 0.4, 0.4, 1.0];
  this.specular = [0.8, 0.8, 0.8, 1.0];
  this.shininess = 100.0;  
  this.vSize = new Vector3(1.0, 1.0, 1.0);//スケーリング
  this.nSlice = 20;
  this.nStack = 20;
  this.radiusRatio = 0.5;//上底半径/下底半径
  this.eps1 = 1.0;//"SUPER"のパラメータ
  this.eps2 = 1.0;//"SUPER"のパラメータ
  this.flagDebug = false;//ソリッドかワイヤーフレームモデルか
  this.shadow = 0.0;//影の濃さを表す（0.0なら実オブジェクト)
  //フロア表示のチェック模様
  this.flagCheck = false;
  this.col1 = [0.55, 0.5, 0.5, 1.0];
  this.col2 = [0.4, 0.42, 0.55, 1.0];
}

Rigid_HS.prototype.initVertexBuffers = function(gl)
{
  var nLength;
  var vertices = [];//頂点座標
  var normals = []; //法線ベクトル
  var indices = []; //頂点番号

  if     (this.kind == "CUBE") nLength = makeCube(vertices, normals, indices, this.flagDebug);
  else if(this.kind == "SPHERE") nLength = makeSphere(vertices, normals, indices, this.nSlice, this.nStack);
  else if(this.kind == "CYLINDER")nLength =  makeCylinder(vertices, normals, indices, this.radiusRatio, this.nSlice, this.flagDebug);
  else if(this.kind == "PRISM") nLength = makePrism(vertices, normals, indices, this.radiusRatio, this.nSlice, this.flagDebug);
  else if(this.kind == "TORUS") nLength = makeTorus(vertices, normals, indices, this.radiusRatio, this.nSlice, this.nStack);
  else if(this.kind == "SUPER") nLength = makeSuper(vertices, normals, indices, this.nSlice, this.nStack, this.eps1, this.eps2);
  else if(this.kind == "CYLINDER_Z") nLength = makeCylinderZ(vertices, normals, indices, this.nSlice, this.flagDebug);
 
  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  var normalBuffer = gl.createBuffer();
  if(this.flagCheck) var colorBuffer = gl.createBuffer();
  var indexBuffer = gl.createBuffer();
  if (!vertexBuffer || !normalBuffer || !indexBuffer) return -1;
  
  // 頂点の座標をバッファオブジェクトに書き込む
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(vertices), gl.STATIC_DRAW);
  // vertexLocにバッファオブジェクトを割り当て、有効化する
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
 
  // 法線データをバッファオブジェクトに書き込む
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(normals), gl.STATIC_DRAW);//法線は頂点データと同じ
  // normalLocにバッファオブジェクトを割り当て、有効化する
  var normalLoc = gl.getAttribLocation(gl.program, 'a_normal');
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(normalLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // インデックスをバッファオブジェクトに書き込む
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  
  if(this.kind == "SPHERE" || this.kind == "TORUS" || this.kind == "SUPER"  || this.kind == "CHECK_PLATE"  )
  {
//alert("kind="+ this.kind);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }
  else
  {
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,  new Uint8Array(indices), gl.STATIC_DRAW);
  }
  return nLength;
}

Rigid_HS.prototype.draw = function(gl, n, modelMatrix)
{
  //マテリアル特性のユニフォーム変数格納場所を取得し値を設定する
  var diffLoc = gl.getUniformLocation(gl.program, 'u_diffuseColor');
  gl.uniform4fv(diffLoc, new Float32Array(this.diffuse));
  var ambiLoc = gl.getUniformLocation(gl.program, 'u_ambientColor');
  gl.uniform4fv(ambiLoc, new Float32Array(this.ambient));
  var specLoc = gl.getUniformLocation(gl.program, 'u_specularColor');
  gl.uniform4fv(specLoc, new Float32Array(this.specular));
  var shinLoc = gl.getUniformLocation(gl.program, 'u_shininess');
  gl.uniform1f(shinLoc, this.shininess);
  var checkLoc = gl.getUniformLocation(gl.program, 'u_flagCheck');
  gl.uniform1i(checkLoc, this.flagCheck);

  var shadowLoc = gl.getUniformLocation(gl.program, 'u_shadow');
//alert("s="+this.shadow);
  gl.uniform1f(shadowLoc, this.shadow);

  // 法線変換行列を計算する
  var normalMatrix = new Matrix4();// 初期化
  if(this.shadow < 0.01)//影でないとき
  {
    normalMatrix.setInverseOf(modelMatrix);//モデルリング行列の逆行列を求め
    normalMatrix.transpose();              //さらに転置する
  }
  //それぞれの行列のuniform変数の格納場所を取得し値を設定する
  var modelMatrixLoc = gl.getUniformLocation(gl.program, 'u_modelMatrix');
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix.elements);
  var normalMatrixLoc = gl.getUniformLocation(gl.program, 'u_normalMatrix');
  gl.uniformMatrix4fv(normalMatrixLoc, false, normalMatrix.elements);

  //物体を描画する
  if(this.kind == "SPHERE" || this.kind == "TORUS" || this.kind == "SUPER" || this.kind == "CHECK_PLATE" )
  {
    if(this.flagDebug == false)
      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
    else
      gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_SHORT, 0);
    //球のようにインデックスデータが多いときはUint16Array(indices)を使用する．このときUNSIGNED_SHORTとする
  }
  else
  {
    if(this.flagDebug == false)
      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    else{
      gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_BYTE, 0);}
  }
}


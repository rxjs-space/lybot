exports.loginCheckSuccessInterval = 60 * 1000;

exports.vehicleTypeXPathHash = {
  '1': '//*[@id="1008"]/div[10]/div[1]/span', // 新建车辆
  '2': '//*[@id="1008"]/div[10]/div[2]/span', // 新建异地报废车辆
  '3': '//*[@id="1008"]/div[10]/div[3]/span', // 新建信息不全车辆
  '4': '//*[@id="1008"]/div[10]/div[4]/span', // 新建罚没车辆
}

exports.lastInputElementXPathHash = {
  '1': '//*[@id="1038"]/input',
  '2': '//*[@id="1038"]/input',
  '3': '//*[@id="1094"]/input',
  '4': '//*[@id="1150"]/input'
}

exports.vehicleDetailsXPathHash = {
  '1': {
    'owner.isPerson': '//*[@id="1047"]/input',
    'owner.name': '//*[@id="1049"]/input',
    'owner.idNo': '//*[@id="1050"]/input',
    'owner.tel': '//*[@id="1051"]/input',
    'owner.address': '//*[@id="1052"]/input',
    'owner.zipCode': '//*[@id="1053"]/input',
    'agent.name': '//*[@id="1054"]/input',
    'agent.idNo': '//*[@id="1055"]/input',
    'vehicle.vehicleType': '//*[@id="1021"]/input',
    'vehicle.useCharacter': '//*[@id="1023"]/input',
    'vehicle.isNEV': '//*[@id="1043"]/input',
    'vehicle.brand': '//*[@id="1025"]/input',
    'vehicle.model': '//*[@id="1026"]/input',
    'vehicle.plateNo': '//*[@id="1027"]/input',
    'vehicle.displacementL': '//*[@id="1028"]/input',
    // 'vehicle.fuelType': '//*[@id="1029"]/input',
    // 'vehicle.registrationDate': '//*[@id="1031"]/input',
    'vehicle.engineNo': '//*[@id="1032"]/input',
    'vin': '//*[@id="1033"]/input',
    'vinConfirm': '//*[@id="1034"]/input',
    'vehicle.totalMassKG': '//*[@id="1035"]/input',
    'vehicle.lengthOverallM': '//*[@id="1036"]/input',
    'vehicle.seats': '//*[@id="1037"]/input',
  }
}

exports.nonTextInputsHash = {
  '1': [
    'owner.isPerson', 
    'vehicle.vehicleType', 
    'vehicle.useCharacter',
    'vehicle.isNEV',
    // 'vehicle.fuelType',
    // 'vehicle.registrationDate',
  ]
}

exports.nonTextInputOptionXPathHashes = {
  '1': {
    'owner.isPerson': {
      false: '//*[@id="1048"]/div[2]'
    },
    'vehicle.vehicleType': {
      大型载客车: '//*[@id="1022"]/div[1]',
      中型载客车: '//*[@id="1022"]/div[2]',
      小型载客车: '//*[@id="1022"]/div[3]',
      微型载客车: '//*[@id="1022"]/div[4]',
      轿车: '//*[@id="1022"]/div[5]',
      '轿车(小型载客车)': '//*[@id="1022"]/div[6]',
      '轿车(微型载客车)': '//*[@id="1022"]/div[7]',
      重型载货车: '//*[@id="1022"]/div[8]',
      中型载货车: '//*[@id="1022"]/div[9]',
      轻型载货车: '//*[@id="1022"]/div[10]',
      微型载货车: '//*[@id="1022"]/div[11]',
      '三轮汽车（原三轮农用运输车）': '//*[@id="1022"]/div[12]',
      '低速货车（原四轮农用运输车）': '//*[@id="1022"]/div[13]',
      专项作业车: '//*[@id="1022"]/div[14]',
      轮式专用机械车: '//*[@id="1022"]/div[15]',
      普通摩托车: '//*[@id="1022"]/div[16]',
      轻便摩托车: '//*[@id="1022"]/div[17]',
      重型挂车: '//*[@id="1022"]/div[18]',
      中型挂车: '//*[@id="1022"]/div[19]',
      轻型挂车: '//*[@id="1022"]/div[20]',
      半挂牵引车: '//*[@id="1022"]/div[21]',
      全挂车: '//*[@id="1022"]/div[22]',
    },
    'vehicle.useCharacter': {
      '农村客运(营运)': '//*[@id="1024"]/div[1]',
      '城市公交(营运)': '//*[@id="1024"]/div[2]',
      '出租客运(营运)': '//*[@id="1024"]/div[3]',
      '旅游客运(营运)': '//*[@id="1024"]/div[4]',
      '营运其他(营运)': '//*[@id="1024"]/div[5]',
      '非营运': '//*[@id="1024"]/div[6]',
      '危化品运输': '//*[@id="1024"]/div[7]',
    },
    'vehicle.isNEV': {
      否: '//*[@id="1044"]/div[1]',
      是: '//*[@id="1044"]/div[2]'
    },
    'owner.isPerson': {
      否: '//*[@id="1048"]/div[2]',
      是: '//*[@id="1048"]/div[1]'
    },
  }
}

exports.commonElementXPathHashes = {
  '车辆信息检索': '//*[@id="1008"]/div[9]/span'
}

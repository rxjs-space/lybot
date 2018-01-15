// when updating the xpaths, before click a type of entry ('new normal', or 'new remote', or...), refresh the page


exports.mofcomLoginUrl = 'http://ecomp.mofcom.gov.cn/loginCorp.html';

exports.loginCheckSuccessInterval = 60 * 1000;

// todo: not updated
exports.errorMessageXPathHash = {
  '1': {
    'mask': '//*[@class="mask"]',
    'duplicateVIN': '//*[@class="main msg-content"]',
    'duplicateVINContainer': '//*[@class="main msg"]',
  },
  '4': {
    'duplicateVIN': '//*[@class="main msg-content"]',
    'duplicateVINContainer': '//*[@class="main msg"]'
  }
}

exports.vehicleTypeXPathHash = {
  '1': '//*[@title="新建车辆"]', // 新建车辆
  '2': '//*[@title="新建异地报废车辆"]', // 新建异地报废车辆
  '3': '//*[@title="新建信息不全车辆"]', // 新建信息不全车辆
  '4': '//*[@title="新建罚没车辆"]', // 新建罚没车辆
}

exports.topElementXPathHash = {
  '1': '//*[contains(text(), "新建报废车辆( ")]',
  '2': '//*[contains(text(), "新建异地报废车辆( ")]',
  '3': '//*[contains(text(), "新建信息不全报废车辆( ")]',
  '4': '//*[contains(text(), "新建罚没报废车辆( ")]'
}

exports.lastInputElementXPathHash = {
  '1': '//*[contains(text(), "交售日期：")]',
  '2': '//*[contains(text(), "交售日期：")]',
  '3': '//*[contains(text(), "交售日期：")]',
  '4': '//*[contains(text(), "交售日期：")]'
}

exports.formElementXPathHash = {
  '1': '//*[@name="loadform"]',
  '2': '//*[@name="loadform"]',
  '3': '//*[@name="loadform"]',
  '4': '//*[@name="loadform"]'
}



exports.confirmAndNextButtonElementXPathHash = {
  '1': '//*[@title="确定 并下一步"]',
  '2': '//*[@title="确定 并下一步"]',
  '3': '//*[@title="确定 并下一步"]',
  '4': '//*[@title="确定 并下一步"]'
}



exports.dateElementXPathHash = {
  datepickerButton: '//*[@class="fd_dateico"]', // XPathResult.FIRST_ORDERED_NODE_TYPE and singleNodeValue will get the first by this class
  yearButton: '//*[@class="dt_hd_cell dt_hd_y"]',
  year: year => `//*[@title="${year}"]`,
  // year: (year) => `//*[@id="1075"]/div[${year - 1900}]`,
  monthButton: '//*[@class="dt_hd_cell dt_hd_m"]',
  month: (month) => `//*[@title="${month}"][contains(@class, "main ls_item_no")]`,
  // month: (month) => `//*[@id="1076"]/div[${month}]`,
  date: (date, dayOfMonthStart) => `//*[@class="dt_cell"][contains(text(), "${date}")]`,
  // date: (date, dayOfMonthStart) => `/html/body/div[13]/div[2]/div[${7 + date + dayOfMonthStart}]`,
  confirmButton: `//*[@class="dt_btn"][contains(text(), "确认")]`
}


exports.vehicleDetailsXPathHash = {
  'owner.isPerson': `//*[@name="car_is_company_owner"]`,
  'owner.name': `//*[@name="name"]`,
  'owner.idNo': `//*[@name="id_code"]`,
  'owner.tel': `//*[@name="phone"]`,
  'owner.address': `//*[@name="address"]`,
  'owner.zipCode': `//*[@name="postalcode"]`,
  'agent.name': `//*[@name="operator_name"]`,
  'agent.idNo': `//*[@name="operator_id_code"]`,
  'vehicle.vehicleType': `//*[@name="car_detail_type_id"]`,
  'vehicle.useCharacter': `//*[@name="carpropertyid"]`,
  'vehicle.isNEV': `//*[@name="car_is_new_energy"]`,
  'vehicle.brand': `//*[@name="car_brand_type"]`,
  'vehicle.model': `//*[@name="car_model_type"]`,
  'vehicle.plateNo': `//*[@name="car_licence"]`,
  'vehicle.displacementL': `//*[@name="car_displacement"]`,
  'vehicle.fuelType': `//*[@name="car_fuel_type"]`,
  'vehicle.registrationDate': `//*[@id="1034"]/input`, // need key 'vehicle.registrationDate' when looping
  'vehicle.engineNo': `//*[@name="car_engine_code"]`,
  'vin': `//*[@name="car_frame_code"]`,
  'vinConfirm': `//*[@name="car_frame_code1"]`,
  'vehicle.totalMassKG': `//*[@name="car_total_weight"]`,
  'vehicle.lengthOverallM': `//*[@name="car_length"]`,
  'vehicle.seats': `//*[@name="car_passenger_count"]`
}

exports.nonTextInputsHash = {
  '1': [
    'owner.isPerson', 
    'vehicle.vehicleType', 
    'vehicle.useCharacter',
    'vehicle.isNEV',
    'vehicle.fuelType',
  ],
  '2': [
    'owner.isPerson', 
    'vehicle.vehicleType', 
    'vehicle.useCharacter',
    'vehicle.isNEV',
    'vehicle.fuelType',
  ],
  '3': [
    'owner.isPerson', 
    'vehicle.vehicleType', 
    'vehicle.useCharacter',
    'vehicle.isNEV',
    'vehicle.fuelType',
  ],
  '4': [
    'owner.isPerson', 
    'vehicle.vehicleType', 
    'vehicle.useCharacter',
    // 'vehicle.isNEV',
    'vehicle.fuelType',
  ]
}

exports.nonTextInputOptionXPathHashes = {
  '1': {
    'vehicle.vehicleType': value => `//*[@title="${value}"]`,
    // {
    //   '大型载客车': '//*[@title="大型载客车"]',
    //   '中型载客车': '//*[@id="1024"]/div[2]',
    //   '小型载客车': '//*[@id="1024"]/div[3]',
    //   '微型载客车': '//*[@id="1024"]/div[4]',
    //   '轿车(微型载客车)': '//*[@id="1024"]/div[5]',
    //   '轿车': '//*[@id="1024"]/div[6]',
    //   '轿车(小型载客车)': '//*[@id="1024"]/div[7]',
    //   '重型载货车': '//*[@id="1024"]/div[8]',
    //   '中型载货车': '//*[@id="1024"]/div[9]',
    //   '轻型载货车': '//*[@id="1024"]/div[10]',
    //   '微型载货车': '//*[@id="1024"]/div[11]',
    //   '三轮汽车（原三轮农用运输车）': '//*[@id="1024"]/div[12]',
    //   '低速货车（原四轮农用运输车）': '//*[@id="1024"]/div[13]',
    //   '专项作业车': '//*[@id="1024"]/div[14]',
    //   '轮式专用机械车': '//*[@id="1024"]/div[15]',
    //   '普通摩托车': '//*[@id="1024"]/div[16]',
    //   '轻便摩托车': '//*[@id="1024"]/div[17]',
    //   '重型挂车': '//*[@id="1024"]/div[18]',
    //   '中型挂车': '//*[@id="1024"]/div[19]',
    //   '轻型挂车': '//*[@id="1024"]/div[20]',
    //   '半挂牵引车': '//*[@id="1024"]/div[21]',
    //   '全挂车': '//*[@id="1024"]/div[22]',
    //   '基本型': '//*[@id="1024"]/div[23]',
    //   'MPV': '//*[@id="1024"]/div[24]',
    //   'SUV': '//*[@id="1024"]/div[25]',
    //   '交叉型': '//*[@id="1024"]/div[26]',
    //   '客车': '//*[@id="1024"]/div[27]',
    //   '货车': '//*[@id="1024"]/div[28]',
    //   '其他车': '//*[@id="1024"]/div[29]',
    // },
    'vehicle.useCharacter': value => `//*[@title="${value}"]`,
    // {
    //   '农村客运(营运)': '//*[@id="1026"]/div[1]',
    //   '城市公交(营运)': '//*[@id="1026"]/div[2]',
    //   '出租客运(营运)': '//*[@id="1026"]/div[3]',
    //   '旅游客运(营运)': '//*[@id="1026"]/div[4]',
    //   '营运其他(营运)': '//*[@id="1026"]/div[5]',
    //   '非营运': '//*[@id="1026"]/div[6]',
    //   '危化品运输': '//*[@id="1026"]/div[7]',
    // },
    'vehicle.isNEV': value => `//*[@id="1047"]/*[contains(text(), "${value}")]`,
    // {
    //   否: '//*[@id="1046"]/div[1]',
    //   是: '//*[@id="1046"]/div[2]'
    // },
    'owner.isPerson': value => `//*[@id="1051"]/*[contains(text(), "${value}")]`,
    // {
    //   否: '//*[@id="1050"]/div[2]',
    //   是: '//*[@id="1050"]/div[1]'
    // },
    'vehicle.fuelType':  value => `//*[@title="${value}"]`
    // {
    //   汽油: '//*[@id="1032"]/div[1]',
    //   柴油: '//*[@id="1032"]/div[2]',
    //   燃气: '//*[@id="1032"]/div[3]',
    //   其他: '//*[@id="1032"]/div[4]',
    // }
  },
  '2': {
    'vehicle.vehicleType': value => `//*[@title="${value}"]`,
    'vehicle.useCharacter': value => `//*[@title="${value}"]`,
    'vehicle.isNEV': value => `//*[@id="1047"]/*[contains(text(), "${value}")]`,
    'owner.isPerson': value => `//*[@id="1051"]/*[contains(text(), "${value}")]`,
    'vehicle.fuelType':  value => `//*[@title="${value}"]`
  },
  '3': {
    'vehicle.vehicleType': value => `//*[@title="${value}"]`,
    'vehicle.useCharacter': value => `//*[@title="${value}"]`,
    'vehicle.isNEV': value => `//*[@id="1047"]/*[contains(text(), "${value}")]`,
    'owner.isPerson': value => `//*[@id="1051"]/*[contains(text(), "${value}")]`,
    'vehicle.fuelType':  value => `//*[@title="${value}"]`
  },
  '4': {
    'vehicle.vehicleType': value => `//*[@title="${value}"]`,
    'vehicle.useCharacter': value => `//*[@title="${value}"]`,
    // 'vehicle.isNEV': value => `//*[@id="1047"]/*[contains(text(), "${value}")]`,
    'owner.isPerson': value => `//*[@id="1049"]/*[contains(text(), "${value}")]`,
    'vehicle.fuelType':  value => `//*[@title="${value}"]`
  },
}

exports.commonElementXPathHashes = {
  '车辆信息检索': '//*[@title="车辆信息检索"]',
  // '回收证明单编号': '//*[@id="1180"]/div/p[6]',
  // '保存': '//*[@id="1337"]/div/span/span', // 保存 after submitting newEntry
  // '车辆列表（企业）': '//*[@title="车辆列表（企业）"]'
}

// 判断数据类型
export const getDataType = (data: any, caseType = 'lower') => {
  const type = Object.prototype.toString.call(data).match(/\s+(\S*)\]/)[1]
  return caseType === 'lower' ? type.toLowerCase() : caseType === 'upper' ? type.toUpperCase() : type
}
// 判断是否是一个对象
export function isObject(obj: any) {
  if (obj === undefined || obj === null) {
    return false;
  } else {
    return getDataType(obj) === 'object';
  }
}
// 获取随机数
export function getRandom() {
  if (typeof Uint32Array === 'function') {
    let cry: any = '';
    if (typeof window !== 'undefined' && window.crypto) {
      cry = window.crypto;
    // tslint:disable-next-line
    } else if (typeof window !== 'undefined' && (window as any).msCrypto) {
      // tslint:disable-next-line
      cry = (window as any).msCrypto;
    }
    if (isObject(cry) && cry.getRandomValues) {
      var typedArray = new Uint32Array(1);
      var randomNumber = cry.getRandomValues(typedArray)[0];
      var integerLimit = Math.pow(2, 32);
      return randomNumber / integerLimit;
    }
  }
  return getRandomBasic(10000000000000000000) / 10000000000000000000;
}

export const getRandomBasic = (function() {
  var today = new Date();
  var seed = today.getTime();

  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280.0;
  }
  return function rand(number) {
    return Math.ceil(rnd() * number);
  };
})();

// 获取随机用户id
export function getUUID() {
  return (
    '' +
    Date.now() +
    '-' +
    Math.floor(1e7 * getRandom()) +
    '-' +
    getRandom().toString(16).replace('.', '') +
    '-' +
    String(getRandom() * 31242)
    .replace('.', '')
    .slice(0, 8)
  );
}

// 获取当前页面信息
export const getPageInfo = () => {
  const pageInfo = {
    url: window.location.href, // 页面url
  }
  return pageInfo
}

/**
 * @description 字符串或数字类型
 * @return {*}
 */
export type strOrNumType = string | number

/**
 * @description 日期常用格式类型
 * @return {*}
 */
export type dateType = Date | strOrNumType

/**
 * @description 开始位置
 * @return {*}
 */
export enum StartPositionEnum {
  START = 'START',
  END = 'END'
}

/**
 * @group 【public】
 * @category 修正字符串或数字的长度
 * @param {strOrNumType} params 传入的字符串或数字
 * @param {number} len 修正后的长度
 * @param {string} fillText 修正时填充用的字符
 * @param {StartPositionEnum} startPosition 从什么位置开始填充
 * @return {strOrNumType} 返回修正后的字符串或数字
 */
export const reviseLength = <T extends strOrNumType>(params: T, len: number, fillText: string = '0', startPosition: StartPositionEnum = StartPositionEnum.END): strOrNumType => {
  // 获取传入字符串的长度
  let newParams = params + ''
  if (newParams.length >= len) {
    newParams = newParams.slice(0, len)
  } else{
    newParams = startPosition === StartPositionEnum.END ? newParams.padEnd(len, fillText) : newParams.padStart(len, fillText)
  }
  return typeof params === 'number' ? parseInt(newParams) : newParams
}

/**
 * @group 【date】
 * @category 获取格林威治时间
 * @param {dateType} date 传入日期
 * @return {Date} 格林威治时间
 */
export const getDate = (date: dateType): Date => {
  if (date instanceof Date) {
    return date
  }
  if (typeof date === 'number') {
    // 如果是number，增加位数不全
    return new Date(reviseLength(date, 13))
  }
  if (typeof date === 'string') {
    if (!!date) {
      // 如果是number字符串，增加位数不全
      if (!isNaN(+date)) {
        date = reviseLength(date, 13)
      }
      // eslint-disable-next-line no-useless-escape
      date = (date as string).replace(/\-/g, '/').replace(/\./g, '/')
      let newDate = new Date(date)
      // 这里判断Invalid Date的清空，做浏览器兼容性处理
      if (isNaN(newDate.getTime())) {
        date = date.replace(/\//g, '-')
        newDate = new Date(date)
      }
      return newDate
    }
    return new Date()
  }
  return new Date()
}

/**
 * @group 【number】
 * @category 数字小于10进行自动补零
 * @param {number} params 要补零的数字
 * @return {string} 补零后的数字
 */
export const padNumber = (params: number): string => (params < 10 ? '0' + params : params + '')

/**
 * @group 【date】
 * @category 格式化日期
 * @param {dateType} time 要进行格式化的日期数据
 * @param {string} format 格式
 * @param {string} fillZero 是否自动补零，默认自动补零
 * @return {string} 格式化后的日期
 */
export const formatDate = (time: dateType, format: string = 'YYYY-MM-DD HH:mm:ss', fillZero: boolean = true): string => {
  const date = getDate(time)
  const week = ['日', '一', '二', '三', '四', '五', '六']
  return format.replace(/YYYY|yyyy|YY|yy|MM|DD|HH|hh|mm|SS|ss|week/g, (key: string): string => {
    switch (key) {
      case 'YYYY':
      case 'yyyy':
        return date.getFullYear() + ''
      case 'YY':
      case 'yy':
        return (date.getFullYear() + '').slice(2)
      case 'MM':
        return fillZero ? padNumber(date.getMonth() + 1) : date.getMonth() + 1 + ''
      case 'DD':
        return fillZero ? padNumber(date.getDate()) : date.getDate() + ''
      case 'HH':
      case 'hh':
        return fillZero ? padNumber(date.getHours()) : date.getHours() + ''
      case 'mm':
        return fillZero ? padNumber(date.getMinutes()) : date.getMinutes() + ''
      case 'SS':
      case 'ss':
        return fillZero ? padNumber(date.getSeconds()) : date.getSeconds() + ''
      case 'week':
        return week[date.getDay()]
    }
  })
}
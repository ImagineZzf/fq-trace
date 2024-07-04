import { getUUID, getPageInfo, formatDate } from './utils'
// 日志管理
const logger = {
  showLog: false,
  info(...rest){
    // 如果显示日志，则打印日志
    if (this.showLog) {
      console.log(...rest)
    }
  }
}

interface requestInterface {
  post: (url: string, data: any) => void
}

// 默认请求函数
const defaultRequest = () => {

  function postRequest(url: string, data: any) {
    return fetch(url, {
      method: 'POST',
      body: data
    })
  }

  return {
    post: postRequest
  }
}

interface storageInterface {
  set: (key: string, value: any) => void
  get: (key: string) => any
  remove: (key: string) => void
}

// 数据存储逻辑
class Storage {
  // 设置缓存
  set(key: string, value: any) {
    const fun = function() {
      localStorage.setItem(key, JSON.stringify(value))
    }
    try {
      fun()
    } catch(e) {
      logger.info('设置缓存失败:', e)
      try {
        fun()
      } catch(err) {
        logger.info('设置缓存再次失败:', err)
      }
    }
  }
  // 获取缓存
  get(key: string) {
    let store = null
    let obj = null
    try {
      obj = localStorage.getItem(key)
    } catch(e) {
      logger.info('获取缓存失败:', e)
      try {
        obj = localStorage.getItem(key)
      } catch(err) {
        logger.info('获取缓存再次失败:', err)
      }
    }
    if (obj){
      try {
        store = JSON.parse(obj)
      } catch(e) {
        logger.info('获取缓存数据失败:', e)
      }
    }
    
    return store
  }
  remove(key: string) {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      logger.info('清除缓存数据失败:', e)
    }
  }

}

interface configInterface {
  server_url?: string
  show_log?: boolean
  storage_state_key?: string
  batch_send?: boolean
  autoTrack?: boolean
  loginIdKey?: string
  request?: () => requestInterface
  store?: () => storageInterface
  track_type?: string[]
  beforeSend?: (...rest) => {}
}

// 默认配置
const defaultConfig: configInterface = {
  server_url: '', // 接口地址
  show_log: false, // 是否显示打印日志
  storage_state_key: 'radar_mayi',
  batch_send: false, // 是否批量发送，暂时先不开发该功能
  autoTrack: false, // 是否自动上报事件
  // autoTrack: {
  //   pageLeave: true, // 是否离开是否自动上报事件，默认自动上报时采用进入页面相同事件
  // },
  loginIdKey: 'uid', // 标记登录用户身份的key
}

// 埋点SDK
class Radar {
  config: configInterface
  request: any
  storage: storageInterface
  trackType: string[]
  state: any
  pageInfo: any
  globalProperties: any
  profile: any
  customProperties: any
  

  constructor(config: configInterface = {}) {
    // 埋点配置信息
    this.config = {
      ...defaultConfig,
      ...config
    }
    // 设置是否打印日志
    logger.showLog = this.config.show_log
    // 请求方法
    this.request = config.request ? config.request() : defaultRequest()
    // 本地缓存
    this.storage = config.store ? config.store() : new Storage()

    // 支持的事件类型
    this.trackType = ['view', 'click', 'result', 'share']

    // 状态管理器
    this.state = {}
    // 当前页面信息
    this.pageInfo = {}
    // 公共属性
    this.globalProperties = {}
    // 个人信息相关数据
    this.profile = {}
    // 私有公共属性
    this.customProperties = {}
  }
  
  // 初始化【feat-9814】
  init() {
    // 初始化设置状态
    this.initState()
    // 初始化代理
    this.initProxy()
  }

  // 初始化设置状态
  initState() {
    // 优先获取本地缓存，如果没有，则设置
    const storageState = this.storage.get(this.config.storage_state_key)
    if (storageState) {
      this.state = storageState
    } else {
      const defaultState = {
        distinct_id: getUUID(), // 唯一id
      }
      this.setState(defaultState)
    }
    logger.info(storageState)
  }

  // 初始化代理
  initProxy() {
    this.initWebProxy()
  }

  // 设置state
  setState(obj) {
    this.state = {
      ...this.state,
      ...obj
    }
    this.storage.set(this.config.storage_state_key, this.state)
  }

  // 清除state
  clearState() {
    this.state = {}
    this.storage.remove(this.config.storage_state_key)
  }

  // 设置公共属性
  setGlobal(obj) {
    this.globalProperties = {
      ...this.globalProperties,
      ...obj
    }
  }

  // 设置个人信息
  setProfile(obj) {
    this.profile = {
      ...this.profile,
      ...obj
    }
  }

  // 设置私有公共属性
  setCustom(obj) {
    this.customProperties = {
      ...this.customProperties,
      ...obj
    }
  }

  // 登录
  login(value) {
    this.setProfile({
      [this.config.loginIdKey]: value
    })
  }

  // 退出
  logout() {
    // 退出时将个人信息相关内容清空
    this.profile = {}
    this.customProperties = {}
  }

  // 自定义事件埋点
  track(type, eventName, data = {}, callback = { pageLeave: true }) {
    if (!type || !this.trackType.includes(type)) {
      logger.info(`不支持该事件类型, 目前仅支持${this.trackType.join('、')}`)
      return
    }
    if (!this.config.batch_send) {
      const time = Date.now()
      // 单次上报
      this.sendData({
        type,
        event: eventName,
        time,
        data,
      }, callback)

      if (type === 'view') {
        if (callback && typeof callback === 'object' && callback.pageLeave) {
          // 如果是浏览事件，则自动触发页面离开上报事件【feat-9814】
          this.pageInfo = {
            time,
            type,
            event: eventName,
            data,
          }
          return
        }
      }
    } else {
      // 批量发送，则先将数据存起来，然后根据批量发送的逻辑进行自动发送。
    }
  }

  // 默认上报数据格式化
  defaultFormatSendData(data) {
    return {
      ...this.state, // 唯一标识等信息
      ...this.globalProperties, // 公共属性
      ...this.profile, // 个人信息
      type: data.type, // 事件类型
      event: data.event, // 事件名字
      time: formatDate(data.time), // 上报时间
      properties: {
        ...getPageInfo(), // 页面url等信息
        ...this.customProperties, // 私有公共数据
        ...data.data, // 自定义属性
      }
    }
  }

  // 上报数据
  sendData(data = {}, callback) {
    if (!this.config.server_url) {
      // 如果上报地址为空，则不上报
      return
    }
    let lastData = this.defaultFormatSendData(data)
    // 如果需要预处理上报数据，则自行处理
    if (this.config.beforeSend && typeof this.config.beforeSend === 'function') {
      lastData = this.config.beforeSend(lastData, this)
    }
    
    logger.info(JSON.stringify(lastData, null, '  '));
    this.request.post(this.config.server_url, lastData).then(res => {
      if (callback && typeof callback === 'function') {
        callback()
      }
    })
  }

  // 初始化web端代理
  initWebProxy() {
    const _this = this
    const historyPushState = window.history.pushState;
    const historyReplaceState = window.history.replaceState;
    window.history.pushState = function() {
      _this.onPageLeave('hide')
      historyPushState.apply(window.history, arguments);
    };
    window.history.replaceState = function() {
      _this.onPageLeave('unload')
      historyReplaceState.apply(window.history, arguments);
    };
    // 监听页面popState
    window.addEventListener('popstate', () => {
      _this.onPageLeave('unload')
    })
    // 页面隐藏、卸载，也算离开【feat-9814】
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏
        _this.onAppHide()
        this.onPageLeave('hide')
      } else if (document.visibilityState === 'visible') {
        // 页面显示
        _this.onAppShow()
      }
    })
  }

  // 应用显示
  onAppShow() {
    if (this.config['onAppShow'] && typeof this.config['onAppShow'] === 'function') {
      this.config['onAppShow']({}, this)
      return
    }
  }

  // 应用隐藏
  onAppHide() {
    if (this.config['onAppHide'] && typeof this.config['onAppHide'] === 'function') {
      this.config['onAppHide']({}, this)
      return
    }
  }

  // 页面离开时触发
  onPageLeave(type, routeInfo: any = {}) {
    if (type === 'hide' && this.config['onHide'] && typeof this.config['onHide'] === 'function') {
      this.config['onHide']({}, this)
      return
    }
    if (type === 'unload' && this.config['onUnload'] && typeof this.config['onUnload'] === 'function') {
      this.config['onUnload']({}, this)
      return
    }
    if (this.pageInfo && this.pageInfo.time && this.pageInfo.type === 'view') {
      this.track(this.pageInfo.type, this.pageInfo.event, {
        ...this.pageInfo.data,
        time_on_page: Math.floor(Date.now() / 1000) - Math.floor(this.pageInfo.time / 1000), // 页面停留时间
      })
      this.pageInfo = {}
    }
  }
}

export default Radar
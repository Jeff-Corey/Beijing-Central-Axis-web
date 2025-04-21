// 北京中轴线与古水系地图配置
const config = {
    // 地图基本配置
    mapConfig: {
        center: [39.90923, 116.397428], // 北京市中心坐标
        zoom: 13, // 初始缩放级别
        maxZoom: 18, 
        minZoom: 10
    },
    
    // 应用程序设置
    app: {
        defaultView: 'both', // 默认视图：'centralAxis', 'rivers', 'both', 'none'
        showWelcomeMessage: true,
        welcomeMessage: "欢迎浏览北京中轴线与古水系地图，点击标记可查看详细信息",
        showImagesInPopups: true,
        useDefaultIcons: true
    },
    
    // 地图服务配置
    mapServices: {
        defaultBaseMap: 'OpenStreetMap', // 可选: 'OpenStreetMap', 'Gaode', 'TianDiTu'
        TianDiTu: {
            key: 'a6d1d21b7db94935ae749468799e3dd6', // 如需更换，请前往天地图官网申请
            layers: ['vec', 'cva'] 
        },
        Gaode: {
            enabled: true
        },
        OpenStreetMap: {
            enabled: true
        }
    },
    
    // 样式配置
    styles: {
        // 中轴线样式
        centralAxis: {
            color: '#FF0000', // 鲜红色
            weight: 5,
            opacity: 0.8,
            dashArray: null,
            markerSize: [32, 32]
        },
        
        // 古水系样式
        rivers: {
            // 不同河流使用不同颜色
            moat: {
                color: '#0077CC', // 深蓝色
                weight: 4,
                opacity: 0.8,
                dashArray: null
            },
            jinshui: {
                color: '#00AAFF', // 亮蓝色
                weight: 4,
                opacity: 0.8,
                dashArray: null
            },
            changhe: {
                color: '#33CC99', // 绿松石色
                weight: 4,
                opacity: 0.8,
                dashArray: null
            },
            tonghui: {
                color: '#4455DD', // 蓝紫色
                weight: 4,
                opacity: 0.8,
                dashArray: null
            }
        },
        
        // 信息面板样式
        infoPanel: {
            maxHeight: '300px',
            fontSize: '14px',
            headingColor: '#333'
        }
    }
}; 
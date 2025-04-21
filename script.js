// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log("DOM加载完成，开始初始化...");
        console.log("配置信息:", config);
        
        // 初始化地图
        initMap();
        
        // 根据配置文件中的默认视图设置自动显示相应内容
        if(config && config.app && config.app.defaultView) {
            console.log("加载默认视图:", config.app.defaultView);
            switch(config.app.defaultView) {
                case "centralAxis":
                    showCentralAxis();
                    break;
                case "rivers":
                    showAncientRivers();
                    break;
                case "both":
                    showBoth();
                    break;
                case "none":
                default:
                    // 不显示任何内容
                    console.log("不加载默认视图");
                    break;
            }
        }
        
        // 显示欢迎信息
        if(config && config.app && config.app.showWelcomeMessage) {
            updateInfoPanel(config.app.welcomeMessage || "<h2>北京中轴线与古水系交互地图</h2><p>点击按钮查看北京中轴线或古水系，点击地图上的标记点可查看详细信息。</p>");
        }
    } catch (error) {
        console.error("初始化过程中发生错误:", error);
        // 显示错误信息在页面上
        const errorMsg = `<div style="color:red;padding:10px;border:1px solid red;margin:10px;">
            <h3>加载出错</h3>
            <p>${error.message}</p>
            <pre>${error.stack}</pre>
        </div>`;
        document.body.innerHTML += errorMsg;
    }
});

// 全局变量
let map;
let centralAxisPolyline;
let ancientRiversPolylines = [];
let centralAxisMarkers = [];
let markersLayer;
let riversLayer;

// 初始化地图
function initMap() {
    try {
        // 从配置文件获取地图初始化参数
        const center = config.mapConfig.center || [39.90923, 116.397428];
        const zoom = config.mapConfig.zoom || 14;
        const minZoom = config.mapConfig.minZoom || 10;
        const maxZoom = config.mapConfig.maxZoom || 18;
        
        // 创建Leaflet地图实例
        map = L.map('map-container').setView(center, zoom);
        map.setMinZoom(minZoom);
        map.setMaxZoom(maxZoom);
        
        // 使用高德地图作为底图（无需API Key，可在中国境内访问）
        let gaode = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
            subdomains: "1234",
            attribution: '&copy; <a href="https://amap.com">高德地图</a>',
            maxZoom: maxZoom
        });
        
        // 高德卫星地图
        let gaodeSatellite = L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
            subdomains: "1234",
            attribution: '&copy; <a href="https://amap.com">高德地图</a>',
            maxZoom: maxZoom
        });
        
        // 从配置中获取天地图API Key
        let tiandituKey = config.mapServices.TianDiTu.key || ""; // 天地图API Key
        
        // 天地图矢量图 - 需要API key
        let tianditu = L.tileLayer('https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + tiandituKey, {
            subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
            attribution: '&copy; <a href="https://www.tianditu.gov.cn/">天地图</a>',
            maxZoom: maxZoom
        });
        
        // 天地图标注图层
        let tiandituLabel = L.tileLayer('https://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + tiandituKey, {
            subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
            maxZoom: maxZoom
        });
        
        // 天地图卫星图
        let tiandituSatellite = L.tileLayer('https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + tiandituKey, {
            subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
            attribution: '&copy; <a href="https://www.tianditu.gov.cn/">天地图</a>',
            maxZoom: maxZoom
        });
        
        // 天地图卫星标注
        let tiandituSatelliteLabel = L.tileLayer('https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + tiandituKey, {
            subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
            maxZoom: maxZoom
        });
        
        // 天地图矢量图+标注组合
        let tiandituGroup = L.layerGroup([tianditu, tiandituLabel]);
        
        // 天地图卫星图+标注组合
        let tiandituSatelliteGroup = L.layerGroup([tiandituSatellite, tiandituSatelliteLabel]);
        
        // OpenStreetMap图层
        let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        });
        
        // 创建底图控制器
        let baseMaps = {
            "高德地图": gaode,
            "高德卫星图": gaodeSatellite,
            "天地图": tiandituGroup,
            "天地图卫星图": tiandituSatelliteGroup,
            "OpenStreetMap": osm
        };
        
        // 选择默认底图
        let defaultBase = osm; // 默认使用OSM
        
        // 根据配置选择默认底图
        if (config.mapServices.TianDiTu && config.mapServices.TianDiTu.key) {
            // 有天地图API Key
            if (config.mapServices.defaultBaseMap === 'TianDiTu') {
                // 使用天地图
                if (config.mapServices.TianDiTu.layers && 
                    config.mapServices.TianDiTu.layers.includes('img')) {
                    defaultBase = tiandituSatelliteGroup; // 使用卫星图
                } else {
                    defaultBase = tiandituGroup; // 使用矢量图
                }
            } else if (config.mapServices.defaultBaseMap === 'Gaode') {
                defaultBase = gaode; // 使用高德地图
            }
        }
        
        // 添加默认底图
        defaultBase.addTo(map);
        
        // 添加图层控制器
        L.control.layers(baseMaps, null, {position: 'topright'}).addTo(map);
        
        // 创建图层组，用于管理标记点和线条
        markersLayer = L.layerGroup().addTo(map);
        riversLayer = L.layerGroup().addTo(map);
        
        // 注册按钮事件
        document.getElementById("show-central-axis").addEventListener("click", showCentralAxis);
        document.getElementById("show-ancient-rivers").addEventListener("click", showAncientRivers);
        document.getElementById("show-both").addEventListener("click", showBoth);
        document.getElementById("clear-all").addEventListener("click", clearAll);
    } catch (error) {
        console.error("地图初始化错误", error);
        alert("地图初始化失败 " + error.message);
    }
}

// 创建自定义图标
function createCustomIcon(type) {
    try {
        let iconUrl;
        let iconSize;
        
        // 根据类型选择图标
        if (type === 'river') {
            iconUrl = 'images/default/river.svg';
            iconSize = [25, 25]; // 河流图标尺寸
        } else {
            // 中轴线地标使用默认图标
            iconUrl = 'images/default/placeholder.svg';
            iconSize = [28, 28]; // 中轴线图标尺寸略大
        }
        
        return L.icon({
            iconUrl: iconUrl,
            iconSize: iconSize,
            iconAnchor: [iconSize[0]/2, iconSize[1]], // 图标锚点位于底部中心
            popupAnchor: [0, -iconSize[1]] // 弹出窗口相对于图标位置
        });
    } catch (error) {
        console.error('创建图标时出错:', error);
        // 返回默认图标作为备选
        return L.icon({
            iconUrl: 'images/default/placeholder.svg',
            iconSize: [25, 25],
            iconAnchor: [12.5, 25],
            popupAnchor: [0, -25]
        });
    }
}

// 在更新信息面板的部分，修改代码以使用默认占位图
// 以下是修改后的代码片段，替换原有的图片加载部分

// 在updateInfoPanel前添加以下函数
function getImageUrl(imageName, isRiver = false) {
    // 确保imageName有值
    if (!imageName) {
        return isRiver ? 'images/default/river.svg' : 'images/default/placeholder.svg';
    }
    
    // 首先尝试加载自定义图片
    const customImageUrl = `images/${imageName}.jpg`;
    
    // 检查图片是否存在（在浏览器环境中无法直接检查文件是否存在）
    // 所以我们返回自定义图片URL，并在img标签上使用onerror来处理图片加载失败的情况
    return customImageUrl;
}

// 显示北京中轴线
function showCentralAxis(shouldClearMap = true, updatePanel = true) {
    try {
        if (shouldClearMap) {
            clearMap();
        }
        
        // 只有在需要时才更新信息面板
        if (updatePanel) {
            // 更新信息面板提示文字
            updateInfoPanel("<h2>北京中轴线</h2><p>北京中轴线是中国古代城市规划的杰出代表，为世界文化遗产。</p><p>点击地图上的标记可查看各历史地点的详细信息和图片。</p>");
        }
        
        // 中轴线点位坐标
        const axisPoints = [
            { 
                lng: 116.391295, 
                lat: 39.858997, 
                name: "永定门", 
                info: "明清北京城南城门，中轴线南起点。最初建于明永乐十七年（1419年），原名\"祥符门\"，寓意吉祥。清顺治初年更名为\"永定门\"，取\"永远安定\"之意。作为北京内城南面正中的城门，是古代皇帝前往祭天、祭地时必经之路。1957年因城市建设需要被拆除，2005年在原址重建。重建的永定门城楼高40米，宽41.5米，进深16.5米，规模宏大，再现了明清古都的壮丽景观。",
                icon: "yongdingmen"
            },
            { 
                lng: 116.390511, 
                lat: 39.865949, 
                name: "先农坛", 
                info: "明清时期皇帝祭祀先农神的场所，始建于明永乐十八年（1420年）。先农坛是中国古代帝王祭祀神农氏和历代农业先贤的场所，也是皇帝每年春季举行\"亲耕礼\"的地方。在这里，皇帝会象征性地耕种几犁，以示重农。坛区为方形，周长约5.6公里，南北长1600米，东西宽约1700米，总面积近300公顷。现存的先农坛主要建筑包括正殿、配殿、斋宫、神厨、神库等，是研究中国古代农耕文明和祭祀文化的重要遗址。",
                icon: "xiannongtan"
            },
            { 
                lng: 116.391081, 
                lat: 39.878223, 
                name: "天坛", 
                info: "明清两朝皇帝祭天的场所，始建于明永乐十八年（1420年），是现存中国古代规模最大、保存最完整的祭天建筑群。天坛由南向北分为外坛和内坛两部分，主要建筑有圜丘坛、祈年殿、皇穹宇、回音壁等。圜丘坛是皇帝祭天的主要场所，为三层汉白玉石砌成的圆形祭坛；祈年殿是皇帝祈祷丰年的地方，为中国现存最大的圆形祭祀建筑，其独特的三重檐、四柱支顶的木结构设计体现了精湛的建筑技艺。天坛以其深厚的历史文化内涵和精美的建筑艺术，于1998年被列入《世界遗产名录》。",
                icon: "tiantan"
            },
            { 
                lng: 116.392908, 
                lat: 39.898453, 
                name: "正阳门", 
                info: "又称前门，是明清北京内城南面的正门，建于明永乐十七年（1419年）。正阳门包括城楼和箭楼两部分，中间为瓮城，结构独特。城楼高38米，是北京九门中最高大的城门；箭楼建于明代，是防御箭楼的典型代表。由于位于皇城前面，故称\"前门\"，是古都北京重要的象征。清代，正阳门是元宵灯节的中心，商业与民俗活动繁盛。正阳门建筑风格独特，红墙黄瓦，斗拱层叠，远观气势雄伟。城楼下的牌坊上\"正阳门\"三字为清代著名书法家铁保所书，现保存完好。正阳门见证了北京城600年的沧桑变化，是研究中国古代城市规划和军事防御体系的重要实物资料。",
                icon: "zhengyanmen"
            },
            { 
                lng: 116.397423, 
                lat: 39.908929, 
                name: "天安门", 
                info: "明清时北京城的正门，现为中华人民共和国的象征。天安门初建于明永乐十五年（1417年），原名\"承天门\"，是紫禁城南正门的城楼，清顺治八年（1651年）改名为\"天安门\"。天安门城楼高34.7米，建筑面积4800平方米，共有9个门，正中的金水桥横跨金水河。天安门前矗立着华表一对，是古代宫殿前的装饰物，象征着皇权至高无上。1949年10月1日，毛泽东在天安门城楼上宣布中华人民共和国成立，使天安门成为新中国的重要象征。城楼上悬挂有毛泽东的巨幅画像，两侧为\"中华人民共和国万岁\"和\"世界人民大团结万岁\"巨型标语。天安门广场是世界上最大的城市中心广场，广场中心建有人民英雄纪念碑、毛主席纪念堂等重要建筑。",
                icon: "tiananmen"
            },
            { 
                lng: 116.397398, 
                lat: 39.916344, 
                name: "故宫", 
                info: "明清两代的皇家宫殿，世界上现存规模最大、保存最完整的古代宫殿建筑群。始建于明永乐四年（1406年），历时14年完成，占地面积72万平方米，建筑面积约15万平方米，有大小宫殿七十余座，房屋九千余间。故宫分为外朝和内廷两部分：外朝以太和殿、中和殿、保和殿三大殿为中心，是皇帝举行大典和处理朝政的地方；内廷以乾清宫、交泰殿、坤宁宫后三宫为中心，是皇帝和后妃居住的区域。故宫建筑布局严整，中轴对称，层次分明，集中体现了中国传统建筑的精华和特色。故宫珍藏有大量珍贵文物，包括绘画、陶瓷、玉器、青铜器、宫廷用品等，总数达90万件，是中国古代艺术和历史的宝库。1987年，故宫被联合国教科文组织列入《世界遗产名录》。",
                icon: "gugong"
            },
            { 
                lng: 116.390224, 
                lat: 39.922568, 
                name: "景山", 
                info: "位于故宫北侧的人工山，也是北京中轴线上的重要节点。景山始建于元代，明永乐年间加高扩建，成为皇家园林。景山高45.7米，是用开挖紫禁城护城河的土堆积而成，按五峰设计，象征五行（金、木、水、火、土）。其中心建筑是万春亭，登高远眺，可俯瞰整个故宫和北京城全景。明朝末年崇祯十七年（1644年），明崇祯皇帝李自成攻入北京时，在景山自缢身亡，这里也因此成为历史的见证。清代，景山成为皇家祭祀和游赏的场所。1928年对外开放，成为北京市民休闲的公园。景山不仅是北京城市规划中轴线的重要组成部分，也是研究中国古代皇家园林艺术和风水观念的重要实例。",
                icon: "jingshan"
            },
            { 
                lng: 116.390575, 
                lat: 39.933135, 
                name: "鼓楼与钟楼", 
                info: "古代用于报时的建筑，是北京中轴线上的地标。钟楼始建于元大都时期，明永乐十八年（1420年）重建，清代多次修葺。钟楼高33米，占地面积1600平方米，为两层木结构楼阁式建筑，内悬大钟，每到时辰鸣钟报时。鼓楼位于钟楼北侧，与钟楼隔街相望，始建于元代，明清两代多次重修。鼓楼高46.7米，为两层木结构，内设大鼓，古时每日傍晚击鼓报时，与钟楼\"晨钟暮鼓\"相呼应，形成北京古城独特的时间报告系统。钟鼓楼之间的街道曾是北京最繁华的商业区之一，汇聚了众多老字号商铺。钟鼓楼见证了北京城的历史变迁，体现了中国古代科技和建筑艺术的成就，也是研究中国古代计时系统的重要实物资料。",
                icon: "gulou"
            },
            { 
                lng: 116.389968, 
                lat: 39.937932, 
                name: "地安门", 
                info: "北京内城北部的城门，中轴线北段的重要节点。始建于明永乐十七年（1419年），原名\"平则门\"，取\"地平则安\"之意，清代改名为\"地安门\"。地安门是明清时期北京皇城九门之一，也是进入内城的重要通道。地安门城楼为砖木结构，高约16米，城门两侧是完备的城墙和瓮城。历史上，地安门一带是达官贵人聚居的区域，也是重要的商业街区，仍保留着众多历史街区和胡同。地安门城楼虽已不复存在，但地安门大街仍是北京重要的南北交通干线，连接故宫与北海公园。地安门作为北京中轴线的组成部分，体现了中国古代城市规划的理念和特色。",
                icon: "dianmen"
            },
            { 
                lng: 116.389925, 
                lat: 39.949092, 
                name: "雍和宫", 
                info: "清代皇家寺院，现为北京最大的藏传佛教寺院。始建于康熙三十三年（1694年），原为和硕雍亲王府第，雍正即位后改为皇家佛寺，乾隆九年（1744年）正式更名为\"雍和宫\"。寺院占地约6万平方米，建筑面积约2.5万平方米，沿中轴线由南向北依次为山门殿、天王殿、雍和宫三大殿、法轮殿和万福阁，布局严谨。雍和宫融合了汉、满、蒙、藏等多民族建筑和文化特色，体现了清朝\"满汉一家\"的政治理念。寺内珍藏众多佛教艺术珍品，如高18米的乾隆御制白檀木雕弥勒佛立像，被列入吉尼斯世界纪录，还有精美的唐卡、佛像、法器等。雍和宫自清代以来一直是国家重要的宗教场所，见证了中国宗教政策的演变，也是研究藏传佛教在内地传播的重要实例。",
                icon: "yonghegong"
            },
            { 
                lng: 116.392597, 
                lat: 39.967738, 
                name: "奥林匹克塔", 
                info: "现代中轴线北延长线上的地标建筑，位于北京奥林匹克公园内。奥林匹克塔（又称\"北京奥林匹克公园观光塔\"）高258米，由主塔体和裙房两部分组成，于2014年完工。塔顶设有观光平台，登高可俯瞰整个奥林匹克公园和北京北部城区全景。奥林匹克塔是北京举办2008年奥运会的重要纪念建筑，也是中轴线向北延伸的现代标志，体现了北京古都风貌与现代城市景观的完美结合。奥林匹克公园是2008年北京奥运会的主要场地，包括鸟巢、水立方等著名场馆，已成为北京重要的文化休闲区和旅游景点。奥林匹克塔的建设代表了北京中轴线的现代延伸，展示了中国传统城市规划理念在当代的传承与创新。",
                icon: "olympictower"
            }
        ];
        
        // 创建中轴线
        const centralAxis = L.polyline(axisPoints.map(point => [point.lat, point.lng]), {
            color: config.styles.centralAxis.color,
            weight: config.styles.centralAxis.weight,
            opacity: config.styles.centralAxis.opacity,
            dashArray: config.styles.centralAxis.dashArray
        }).addTo(markersLayer);
        centralAxisPolyline = centralAxis;
        
        // 中轴线上的历史地点信息
        const historicalSites = axisPoints;
        
        // 为每个历史地点创建标记
        historicalSites.forEach(site => {
            try {
                // 使用文字标记替代图标
                const marker = L.marker([site.lat, site.lng], {
                    icon: L.divIcon({
                        className: 'text-marker',
                        html: `<div class="marker-label axis-label">${site.name}</div>`,
                        iconSize: null
                    })
                }).addTo(markersLayer);
                
                // 准备弹出窗口内容（显示图片）
                let popupContent = `<h3>${site.name}</h3>`;
                
                if (config.app.showImagesInPopups) {
                    // 使用site.icon作为图片名的默认值
                    const imageName = (site.image || site.icon + '_large');
                    popupContent += `<img src="${getImageUrl(imageName)}" alt="${site.name}" class="popup-image" onerror="this.src='images/default/placeholder.svg'">`;
                }
                
                // 添加弹出窗口
                marker.bindPopup(popupContent);
                
                // 准备信息面板内容（只有文字）
                let infoPanelContent = `<h2>${site.name}</h2>`;
                infoPanelContent += `<p>${site.info}</p>`;
                
                // 点击事件处理
                marker.on('click', function() {
                    updateInfoPanel(infoPanelContent);
                });
            } catch (error) {
                console.error(`创建${site.name}标记时出错:`, error);
            }
        });
        
        // 调整地图视图以包含所有中轴线点位
        if (centralAxisPolyline) {
            map.fitBounds(centralAxisPolyline.getBounds());
        }
    } catch (error) {
        console.error('显示中轴线时出错:', error);
    }
}

// 显示北京古代河道
function showAncientRivers(shouldClearMap = true, updatePanel = true) {
    try {
        if (shouldClearMap) {
            clearMap();
        }
        
        // 只有在需要时才更新信息面板
        if (updatePanel) {
            // 更新信息面板提示文字
            updateInfoPanel("<h2>北京古代水系</h2><p>古代河道是北京城市的重要组成部分，记录了千年历史变迁。</p><p>点击地图上的标记可查看各河流的详细信息和图片。</p>");
        }
        
        // 护城河
        const moatCoordinates = [
            [39.895819, 116.407394],
            [39.897019, 116.417866],
            [39.899874, 116.427650],
            [39.906203, 116.433401],
            [39.917064, 116.433659],
            [39.924656, 116.433487],
            [39.933990, 116.432800],
            [39.940969, 116.430654],
            [39.948777, 116.425676],
            [39.953553, 116.419067],
            [39.954408, 116.410999],
            [39.953724, 116.402416],
            [39.951809, 116.392717],
            [39.947720, 116.385979],
            [39.941512, 116.382932],
            [39.934705, 116.381645],
            [39.925586, 116.380786],
            [39.917235, 116.381043],
            [39.907844, 116.382502],
            [39.899192, 116.387566],
            [39.895819, 116.395977],
            [39.895819, 116.407394]
        ];
        
        // 创建河流线
        const moatLine = L.polyline(moatCoordinates, config.styles.rivers.moat).addTo(riversLayer);
        ancientRiversPolylines.push(moatLine);
        
        // 创建护城河标记
        try {
            // 使用文字标记替代图标
            const moatMarker = L.marker(moatCoordinates[0], {
                icon: L.divIcon({
                    className: 'text-marker',
                    html: '<div class="marker-label river-label">护城河</div>',
                    iconSize: null
                })
            }).addTo(riversLayer);
            
            // 准备弹出窗口内容（显示图片）
            let popupContent = `<h3>护城河</h3>`;
            
            if (config.app.showImagesInPopups) {
                popupContent += `<img src="${getImageUrl('huchenghe_large')}" alt="护城河" class="popup-image" onerror="this.src='images/default/river.svg'">`;
            }
            
            // 添加弹出窗口
            moatMarker.bindPopup(popupContent);
            
            // 准备信息面板内容（只有文字）
            let infoPanelContent = `<h2>护城河</h2>`;
            infoPanelContent += `<p>北京城护城河环绕整个内城墙，全长25公里，宽20-30米。始建于明永乐年间（1403-1424年），为防卫北京城的重要设施。护城河与城墙一起构成了完整的防御系统，同时也用于调节城内水系，防止内涝。今天的护城河大部分已经被改造为道路或公园，但在东南角等地仍保留部分河段。</p>`;
            
            // 点击事件处理
            moatMarker.on('click', function() {
                updateInfoPanel(infoPanelContent);
            });
        } catch (error) {
            console.error('创建护城河标记时出错:', error);
        }
        
        // 金水河
        const jinshuiRiverCoordinates = [
            [39.917235, 116.393833],
            [39.916860, 116.394530],
            [39.916420, 116.395292],
            [39.915755, 116.396172],
            [39.915180, 116.396826],
            [39.914620, 116.397105],
            [39.913899, 116.397235],
            [39.913242, 116.397105],
            [39.912842, 116.396826],
            [39.912516, 116.396172],
            [39.912280, 116.395292],
            [39.912516, 116.394530],
            [39.913071, 116.393833],
            [39.913899, 116.393400],
            [39.914800, 116.393145],
            [39.915730, 116.393145],
            [39.916420, 116.393400],
            [39.917235, 116.393833]
        ];
        
        // 创建金水河线
        const jinshuiLine = L.polyline(jinshuiRiverCoordinates, config.styles.rivers.jinshui).addTo(riversLayer);
        ancientRiversPolylines.push(jinshuiLine);
        
        // 创建金水河标记
        try {
            // 使用文字标记替代图标
            const jinshuiMarker = L.marker(jinshuiRiverCoordinates[0], {
                icon: L.divIcon({
                    className: 'text-marker',
                    html: '<div class="marker-label river-label">金水河</div>',
                    iconSize: null
                })
            }).addTo(riversLayer);
            
            // 准备弹出窗口内容（显示图片）
            let popupContent = `<h3>金水河</h3>`;
            
            if (config.app.showImagesInPopups) {
                popupContent += `<img src="${getImageUrl('jinshuihe_large')}" alt="金水河" class="popup-image" onerror="this.src='images/default/river.svg'">`;
            }
            
            // 添加弹出窗口
            jinshuiMarker.bindPopup(popupContent);
            
            // 准备信息面板内容（只有文字）
            let infoPanelContent = `<h2>金水河</h2>`;
            infoPanelContent += `<p>金水河是紫禁城（故宫）内的人工河道，呈\"凹\"字形环绕太和殿等主要宫殿前的广场。河宽约10米，长约1公里。修建于明永乐十八年（1420年），象征着\"金水环绕，皇权永固\"的含义。金水河上有五座玉石雕刻的桥，称为\"金水桥\"，象征五行（金、木、水、火、土）。今天的金水河保存完好，是故宫最著名的景观之一。</p>`;
            
            // 点击事件处理
            jinshuiMarker.on('click', function() {
                updateInfoPanel(infoPanelContent);
            });
        } catch (error) {
            console.error('创建金水河标记时出错:', error);
        }
        
        // 长河
        const changheRiverCoordinates = [
            [39.915690, 116.325369],
            [39.915853, 116.333352],
            [39.916016, 116.339918],
            [39.916342, 116.346184],
            [39.916668, 116.352364],
            [39.916831, 116.358715],
            [39.916994, 116.364681],
            [39.917157, 116.370989],
            [39.917483, 116.376868],
            [39.917646, 116.381760],
            [39.917320, 116.387210],
            [39.916668, 116.392403],
            [39.916179, 116.396866],
            [39.915853, 116.401158],
            [39.915364, 116.407595],
            [39.914712, 116.414032],
            [39.914060, 116.419741],
            [39.913571, 116.426178],
            [39.912919, 116.431628],
            [39.912267, 116.435833],
            [39.911778, 116.441626],
            [39.911126, 116.446476],
            [39.910474, 116.451756],
            [39.910311, 116.456262]
        ];
        
        // 创建长河线
        const changheLine = L.polyline(changheRiverCoordinates, config.styles.rivers.changhe).addTo(riversLayer);
        ancientRiversPolylines.push(changheLine);
        
        // 创建长河标记
        try {
            // 使用文字标记替代图标
            const changheMarker = L.marker(changheRiverCoordinates[0], {
                icon: L.divIcon({
                    className: 'text-marker',
                    html: '<div class="marker-label river-label">长河</div>',
                    iconSize: null
                })
            }).addTo(riversLayer);
            
            // 准备弹出窗口内容（显示图片）
            let popupContent = `<h3>长河</h3>`;
            
            if (config.app.showImagesInPopups) {
                popupContent += `<img src="${getImageUrl('changhe_large')}" alt="长河" class="popup-image" onerror="this.src='images/default/river.svg'">`;
            }
            
            // 添加弹出窗口
            changheMarker.bindPopup(popupContent);
            
            // 准备信息面板内容（只有文字）
            let infoPanelContent = `<h2>长河</h2>`;
            infoPanelContent += `<p>长河是北京西部的重要河流，始建于元代，经明清两代多次整修扩建。全长约10公里，源于玉泉山，流经颐和园、紫竹院等皇家园林。长河是古代北京西部的重要水源和水运通道，也是皇家园林景观的重要组成部分。今天的长河已被改造为城市公园的景观水系，仍保留着其历史文化价值。</p>`;
            
            // 点击事件处理
            changheMarker.on('click', function() {
                updateInfoPanel(infoPanelContent);
            });
        } catch (error) {
            console.error('创建长河标记时出错:', error);
        }
        
        // 通惠河
        const tonghuiRiverCoordinates = [
            [39.903929, 116.478834],
            [39.906206, 116.475744],
            [39.908645, 116.472439],
            [39.911573, 116.468663],
            [39.913849, 116.465015],
            [39.915963, 116.461153],
            [39.918077, 116.456518],
            [39.920027, 116.452312],
            [39.922141, 116.448107],
            [39.924093, 116.444759],
            [39.926207, 116.441240],
            [39.928158, 116.438279],
            [39.930272, 116.435317],
            [39.932385, 116.432184],
            [39.934336, 116.428836],
            [39.936288, 116.425531],
            [39.938239, 116.422398],
            [39.940514, 116.419437],
            [39.942790, 116.416819],
            [39.945228, 116.414201],
            [39.947504, 116.411926],
            [39.949780, 116.410768],
            [39.952056, 116.409438],
            [39.954493, 116.407677],
            [39.956931, 116.405916],
            [39.959369, 116.404071],
            [39.961482, 116.401624],
            [39.963920, 116.399391],
            [39.966520, 116.397329],
            [39.968632, 116.395310],
            [39.970582, 116.393463]
        ];
        
        // 创建通惠河线
        const tonghuiLine = L.polyline(tonghuiRiverCoordinates, config.styles.rivers.tonghui).addTo(riversLayer);
        ancientRiversPolylines.push(tonghuiLine);
        
        // 创建通惠河标记
        try {
            // 使用文字标记替代图标
            const tonghuiMarker = L.marker(tonghuiRiverCoordinates[0], {
                icon: L.divIcon({
                    className: 'text-marker',
                    html: '<div class="marker-label river-label">通惠河</div>',
                    iconSize: null
                })
            }).addTo(riversLayer);
            
            // 准备弹出窗口内容（显示图片）
            let popupContent = `<h3>通惠河</h3>`;
            
            if (config.app.showImagesInPopups) {
                popupContent += `<img src="${getImageUrl('tonghuihe_large')}" alt="通惠河" class="popup-image" onerror="this.src='images/default/river.svg'">`;
            }
            
            // 添加弹出窗口
            tonghuiMarker.bindPopup(popupContent);
            
            // 准备信息面板内容（只有文字）
            let infoPanelContent = `<h2>通惠河</h2>`;
            infoPanelContent += `<p>通惠河是元代开凿的人工运河，是北京城东部重要的水上交通线。全长约32公里，从北京东北的温榆河引水，南下通过北运河连接大运河。通惠河修建于元大都时期，是元代都城水上交通的主要通道，明清两代多次疏浚整修。通惠河对北京城的物资供应起到了重要作用，是研究中国古代水利工程和水上交通的重要实例。</p>`;
            
            // 点击事件处理
            tonghuiMarker.on('click', function() {
                updateInfoPanel(infoPanelContent);
            });
        } catch (error) {
            console.error('创建通惠河标记时出错:', error);
        }
        
        // 调整地图视图以包含所有河流线条
        if (ancientRiversPolylines.length > 0) {
            const bounds = L.featureGroup(ancientRiversPolylines).getBounds();
            map.fitBounds(bounds);
        }
    } catch (error) {
        console.error('显示古河流时出错:', error);
    }
}

// 同时显示中轴线和古水系
function showBoth() {
    clearMap(); // 先清除地图
    
    // 清空信息面板内容
    updateInfoPanel("");
    
    // 修改调用顺序，或在showAncientRivers中添加参数避免清除地图
    // 传入false作为updatePanel参数，防止这些函数更新信息面板
    showAncientRivers(false, false); // 显示古水系，但不清除地图，不更新信息面板
    showCentralAxis(false, false); // 显示中轴线，但不清除地图，不更新信息面板
    
    // 调整地图视图
    const allBounds = L.latLngBounds([]);
    
    // 添加中轴线的边界
    if (centralAxisPolyline) {
        allBounds.extend(centralAxisPolyline.getBounds());
    }
    
    // 添加古河道的边界
    ancientRiversPolylines.forEach(line => {
        allBounds.extend(line.getBounds());
    });
    
    // 设置地图视图
    if (!allBounds.isValid()) {
        // 如果边界无效，使用默认视图
        map.setView(config.mapConfig.center || [39.90923, 116.397428], 
                    config.mapConfig.zoom || 14);
    } else {
        map.fitBounds(allBounds);
    }
}

// 清除所有标记和线条
function clearAll() {
    clearMap();
    
    // 清空信息面板内容
    updateInfoPanel("");
}

// 清除地图上的标记和线条
function clearMap() {
    // 清除已有的图层
    markersLayer.clearLayers();
    riversLayer.clearLayers();
    
    // 重置全局变量
    centralAxisPolyline = null;
    ancientRiversPolylines = [];
    centralAxisMarkers = [];
}

// 更新信息面板
function updateInfoPanel(content) {
    const infoPanel = document.getElementById("info-content");
    if (infoPanel) {
        infoPanel.innerHTML = content;
    }
} 


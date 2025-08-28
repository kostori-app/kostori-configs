/** @type {import('./_kostori_.js')} */
class Kimivod extends AnimeSource {

    name = "kimivod"

    isBangumi = true

    key = "kimivod"

    version = "1.0.4"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/kimivod.js"

    init() {

    }

    get baseUrl() {
        return `https://kimivod.com/`
    }

    get headers() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
    }

    parseAnime(a) {
        let link = a.querySelector('a[title]');
        let img = a.querySelector('img.lazyload');

        let id = link?.attributes['href']?.trim().split('/').filter(Boolean).pop()?.replace('/', '') ?? '';
        let name = link?.attributes['title']?.trim() ?? link?.text.trim() ?? '';

        let image = img?.attributes['data-src']?.trim() ?? '';
        let cover = image.startsWith('http') ? image : `${this.baseUrl}${image}`;

        let updateText = a.querySelector('div.absolute')?.text.trim() ?? '';

        return new Anime({
            id: id,
            title: name,
            subtitle: updateText,
            cover: cover,
            tags: [],
            description: updateText,
        });
    }


    explore = [
        {
            title: "kimivod日番",

            type: "mixed",

            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}vod/show/id/27/page/${page}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.post');
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        },
        {
            title: "kimivod国番",

            type: "mixed",

            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}vod/show/id/28/page/${page}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.post');
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        },
        {
            title: "kimivod美番",

            type: "mixed",

            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}vod/show/id/30/page/${page}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.post');
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        },
        {
            title: "kimivod日剧",

            type: "mixed",

            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}vod/show/id/9/page/${page}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.post');
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        },
        {
            title: "kimivod美剧",

            type: "mixed",

            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}vod/show/id/8/page/${page}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.post');
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        },
        {
            title: "kimivod海外剧",

            type: "mixed",

            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}vod/show/id/12/page/${page}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.post');
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        },
    ]

    search = {
        load:async (keyword,searchOption,page) => {
            let url = `https://cn.kimivod.com/search.php?page=${page}&searchword=${keyword}`
            let res = await Network.get(url, this.headers)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeLis = document.querySelectorAll('li.clearfix');
            let animes = [];

            for (let li of animeLis) {
                let a = li.querySelector('a.myui-vodlist__thumb');
                let detailA = li.querySelector('div.detail h4 a');

                let href = a?.attributes['href']?.trim() ?? '';
                let id = href.split('/').filter(Boolean).pop()?.replace('/', '') ?? '';

                let image = a?.attributes['data-original']?.trim() ?? '';
                let cover = image.startsWith('http') ? image : this.baseUrl + image;

                let title = a?.attributes['title']?.trim() ?? detailA?.text.trim() ?? '';
                let description = li.querySelector('div.detail p')?.text.trim() ?? '';

                let tagNodes = li.querySelectorAll('div.detail p')[1]?.querySelectorAll('span') ?? [];
                let tags = [];
                for (let i = 0; i < tagNodes.length; i++) {
                    let t = tagNodes[i].text.trim();
                    if (t && !t.includes("：") && !t.includes("line")) {
                        tags.push(t);
                    }
                }

                animes.push({
                    id: id,
                    title: title,
                    subtitle: '',
                    cover: cover,
                    tags: tags,
                    description: description,
                });
            }
            document.dispose()

            return {
                animes: animes,
                maxPage: 999
            }
        }
    }

    anime = {
        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}vod/${id}`,{})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('article.transparent');
            let titleElement = document.querySelector('h1.bold.title');
            let title = titleElement?.text.trim() ?? '';
            let span = document.querySelector('details > p > span.right-align');
            let fullText = span?.text.trim() ?? '';
            let parts = fullText.split(/上映的[^,，]*[,，]/);
            let description = parts.length > 1 ? parts[1].trim() : fullText;
            let actors = extractInfoByPrefix(document, '主演:');
            let director = extractInfoByPrefix(document, '導演:');
            let updateInfo = extractInfoByPrefix(document, '更新:');
            let imageElement = document.querySelector('img[itemprop="image"]');
            let imageUrl = imageElement?.attributes['data-src']?.trim() ?? '';
            let eps = parseEps(document)

            let animes = animeDivs.map(a => {
                try {
                    return this.parseAnime(a);  // 调用解析函数
                } catch (e) {
                    console.error("Error parsing anime:", e);  // 打印错误信息
                    return null;  // 出错时返回 null 或其他默认值，跳过当前元素
                }
            }).filter(anime => anime !== null);
            document.dispose()

            return new AnimeDetails({
                id: id,
                title: title,
                cover: imageUrl,
                description: description,
                tags: {
                    "放送日期": updateInfo,
                    "导演": director,
                    "演员": actors
                },
                episode: eps,
                recommend: animes,
                url: this.baseUrl + 'vod/' + id,
            })
        },
        loadEp: async (animeId, epId) => {
            let res = await Network.get(epId,{})
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            let match = res.body.match(/file\s*:\s*["']([^"']+\.m3u8)["']/);

            if (!match) {
                throw "未找到播放链接 (.m3u8)";
            }

            return match[1];
        },
        onClickTag: (namespace, tag) => {},
    }

    settings = {

    }

    translation = {
    }
}

function extractInfoByPrefix(document, prefix) {
    let paragraphs = document.querySelectorAll('div.medium-line > p');
    for (let p of paragraphs) {
        let text = p.text.trim();
        if (text.startsWith(prefix)) {
            let content = text.slice(prefix.length).trim();
            // 如果是用逗号分隔的，拆成数组
            return content.split(/[,，]/).map(s => s.trim()).filter(Boolean);
        }
    }
    return [];
}

function parseEps(document) {
    let eps = {};

    let tabElements = document.querySelectorAll('.tabs a');
    let hasTabs = tabElements.length > 0;

    function collectEpisodes(rootElement, tabTitle) {
        let episodeLinks = rootElement.querySelectorAll('.playno a');
        let tempList = [];

        for (let a of episodeLinks) {
            let linkText = a.text.trim();
            if (/午夜|5ewiki/i.test(linkText)) continue;

            let href = a.attributes['href']?.trim() ?? '';
            if (!href) continue;

            // 尝试提取数字
            let numMatch = linkText.match(/(\d{1,4})/);
            let number = numMatch ? parseInt(numMatch[1], 10) : null;

            tempList.push({
                number,
                link: href,
                title: number ? `第${number}集` : linkText, // 没数字就用原文
            });
        }

        // 如果有数字就按数字排序，没有数字的保持原顺序
        tempList.sort((a, b) => {
            if (a.number != null && b.number != null) {
                return a.number - b.number;
            }
            if (a.number != null) return -1;
            if (b.number != null) return 1;
            return 0;
        });

        let episodeMap = new Map();
        for (let item of tempList) {
            if (!episodeMap.has(item.link)) {
                episodeMap.set(item.link, item.title);
            }
        }

        if (episodeMap.size === 0) {
            episodeMap.set('#', '暂无剧集');
        }

        eps[tabTitle] = episodeMap;
    }

    if (hasTabs) {
        for (let tab of tabElements) {
            let dataUi = tab.attributes['data-ui']?.trim() ?? '';
            if (!dataUi || !dataUi.startsWith('#')) continue;

            let tabTitle = tab.querySelector('span.max')?.text.trim() ?? '';
            if (tabTitle.length === 0) tabTitle = '播放列表';

            let pageId = dataUi.slice(1);
            let pageElement = document.getElementById(pageId);
            if (!pageElement) continue;

            collectEpisodes(pageElement, tabTitle);
        }
    } else {
        collectEpisodes(document, '播放列表');
    }

    return eps;
}



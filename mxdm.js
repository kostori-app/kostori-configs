/** @type {import('./_kostori_.js')} */
class Mxdm extends AnimeSource{
    name = 'mxdm'

    key = 'mxdm'

    version = '1.0.2'

    minAppVersion = '1.2.1'

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/mxdm.js"

    get baseUrl() {
        return `https://www.mxdm.xyz/`
    }

    get userAgent(){
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    }

    parseAnime(a) {
        let link = a.querySelector('a[title]');
        let imagelink = a.querySelector('img.lazy');
        let infolink = a.querySelector('div.module-item-text');
        let subNamelink = a.querySelector('.module-item-caption .video-class');
        let spanPrt = a.querySelectorAll('.video-tag a');

        let id = link?.attributes['href']?.trim().split('/').pop().replace('.html', '') ?? '';
        let name = link?.attributes['title']?.trim() ?? link?.text.trim() ?? '';
        let image = imagelink?.attributes['data-src']?.trim() ?? '';
        let cover = image.startsWith('http') ? image : `${this.baseUrl}${image}`;
        let info = infolink?.text.trim() ?? '';
        let subName = subNamelink?.text.trim() ?? '';
        let categoryList = spanPrt.map(e => e.text.trim()).filter(Boolean);

        return new Anime({
            id: id,
            title: name,
            subtitle: subName ?? '',
            cover: cover,
            tags: categoryList ?? '',
            description: info ?? '',
        });
    }

    explore = [
        {
            title: "mxdm日番",
            type: "mixed",
            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}show/riman--------${page}---.html`,{"User-Agent": this.userAgent});
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.module-item')
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }
            }
        },
        {
            title: "mxdm国番",
            type: "mixed",
            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}show/guoman--------${page}---.html`,{"User-Agent": this.userAgent});
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.module-item')
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }
            }
        },
        {
            title: "mxdm美番",
            type: "mixed",
            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}show/oman--------${page}---.html`,{"User-Agent": this.userAgent});
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.module-item')
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }
            }
        },
        {
            title: "mxdm剧场版",
            type: "mixed",
            load: async (page) => {
                let res = await Network.get(`${this.baseUrl}show/dmdianying--------${page}---.html`,{"User-Agent": this.userAgent});
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.module-item')
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a))
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }
            }
        }
    ]

    search = {
        load:async (keyword,searchOption,page) => {
            let url = `${this.baseUrl}search/${keyword}----------${page}---.html`
            let res = await Network.get(url, {})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.module-search-item')
            let animes = []
            for (let div of animeDivs) {
                let titleLink = div.querySelector('h3 a');
                let id = titleLink?.attributes['href']?.trim().split('/').pop().replace('.html', '') ?? '';
                let title = titleLink?.attributes['title']?.trim() ?? titleLink?.text.trim() ?? '';

                let imageEl = div.querySelector('img.lazy');
                let image = imageEl?.attributes['data-src']?.trim() ?? '';
                let cover = image.startsWith('http') ? image : `${this.baseUrl}${image}`;

                let descEl = div.querySelector('.video-info-items:nth-child(3) .video-info-item');
                let description = descEl?.text.trim() ?? '';

                let tagLinks = div.querySelectorAll('.video-info-items:nth-child(2) .video-info-item a');
                let tags = tagLinks.map(e => e.text.trim()).filter(Boolean);

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
            let res = await Network.get(`${this.baseUrl}dongman/${id}`,{})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.module-item')
            let titleElement = document.querySelector('h1.page-title')
            let title = titleElement.text.trim() ?? ''
            let descriptionElement = document.querySelector('div.video-info-item.video-info-content.vod_content');
            let description = descriptionElement.text.trim() ?? ''
            let tags = extractTagsFromLabel(document, '标签')
            let imageElement = document.querySelector('div.module-item-pic img');
            let imageUrl = imageElement.attributes['data-src'] ?? ''
            let episodeElements = document.querySelectorAll('.module-blocklist a');
            let ep = new Map();
            let ep2 = new Map();

            for (let e of episodeElements) {
                let link = e.attributes['href']?.trim() ?? '';
                let title = e.text?.trim() ?? '';

                if (title.length === 0) {
                    title = `第${ep.size + 1}話`;
                }

                const match = link.match(/dongmanplay\/\d+-(\d+)-\d+\.html/);
                if (match) {
                    const line = parseInt(match[1]);

                    if (line === 1) {
                        ep.set(link, title);
                    } else if (line === 2) {
                        ep2.set(link, title);
                    }
                }
            }

            if (ep.size === 0) {
                ep.set('#', '暂无剧集');
            }

            let eps = {
                "第一线路": ep,
                "最新线路": ep2
            };


            let animes = animeDivs.map(a => {
                try {
                    return this.parseAnime(a);
                } catch (e) {
                    console.error("Error parsing anime:", e);
                    return null;
                }
            }).filter(anime => anime !== null);
            document.dispose()
            return new AnimeDetails({
                id: id,
                title: title,
                cover: imageUrl,
                description: description,
                tags: {
                    "类型": tags,
                },
                episode: eps,
                recommend: animes,
                url: this.baseUrl + "dongman/" + id,
            })
        },

        loadEp: async (animeId, epId) => {
            let res = await Network.get(`${this.baseUrl}${epId}`, {});
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status;
            }

            let document = new HtmlDocument(res.body);
            let div = document.querySelector('.player-wrapper');
            if (!div) throw '未找到播放器节点';

            let scripts = div.querySelectorAll('script');
            let content = null;

            for (let script of scripts) {
                let text = script.text;
                if (text.includes('player_aaaa')) {
                    content = text;
                    break;
                }
            }

            if (!content) throw '未找到包含 player_aaaa 的 script 标签';

            let match = content.match(/(?:var\s+)?player_aaaa\s*=\s*({.*?})\s*;?\s*$/s);
            let jsonStr = match[1];
            let jsonObj = JSON.parse(jsonStr);
            let url = jsonObj.url;
            if (!url) throw "未找到 player_aaaa.url";
            let res2 = await Network.get(`https://danmu.yhdmjx.com/m3u8.php?url=${url}`, {});
            if (res2.status !== 200) {
                throw "Invalid status from m3u8: " + res2.status;
            }

            let html = res2.body;

            function getBetween(text, key) {
                const parts = text.split(key);
                if (parts.length < 2) return null;

                const afterKey = parts[1];
                const quoteStart = afterKey.indexOf('"');
                const quoteEnd = afterKey.indexOf('"', quoteStart + 1);
                if (quoteStart === -1 || quoteEnd === -1) return null;

                return afterKey.slice(quoteStart + 1, quoteEnd);
            }

            let encryptedUrl = getBetween(html, "getVideoInfo(");
            let btToken = getBetween(html, "bt_token");
            if (!encryptedUrl || !btToken) {
                throw "未找到 encryptedUrl 或 btToken";
            }

            let keyBytes =  Convert.encodeUtf8("57A891D97E332A9D");
            let ivBytes =  Convert.encodeUtf8(btToken);
            let encryptedBytes =  Convert.decodeBase64(encryptedUrl);
            let decryptedBytes =  Convert.decryptAesCbc(encryptedBytes, keyBytes, ivBytes);
            let decrypted = Convert.decodeUtf8(decryptedBytes);
            document.dispose()
            return decodeURIComponent(decrypted);
        },

        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    };
}

function extractTagsFromLabel(document, targetLabel) {
    const items = document.querySelectorAll('div.video-info-items');
    for (let item of items) {
        const label = item.querySelector('span.video-info-itemtitle')?.text.trim().replace(/[:：]/g, '');
        if (label === targetLabel) {
            const tagContainer = item.querySelector('div.video-info-item.video-info-actor');
            if (tagContainer) {
                return Array.from(tagContainer.querySelectorAll('a')).map(a => a.text.trim()).filter(Boolean);
            }
        }
    }
    return [];
}
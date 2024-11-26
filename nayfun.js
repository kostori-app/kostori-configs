class Nayfun extends AnimeSource{
    name = "nayfun"

    key = "nayfun"

    version = "1.0.0"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/nayfun.js"

    get baseUrl() {
        return `https://www.nyafun.net`
    }

    parseAnime(a) {
        let link = a.querySelector('a.public-list-exp')
        let imagelink = link.querySelector('img.gen-movie-img')
        let infolink = a.querySelector('span.public-list-prb')
        let subNamelink = a.querySelector('div.public-list-subtitle')
        let spanPrt = a.querySelector('span.public-prt');

        // 解析属性值
        let id = link.attributes['href'].trim() ?? ''
        let name = link.attributes['title'].trim() ?? ''
        let image = imagelink.attributes['data-src'].trim() ?? ''
        let info = infolink.text.trim() ?? ''
        let subName = subNamelink.text.trim() ?? ''
        let category = spanPrt?.text.trim() ?? '';
        let categoryList = category ? category.split(',').map((e) => e.trim()) : [];

        return new Anime({
            id: id,
            title: name,
            subtitle: subName ?? '',
            cover: image,
            tags: categoryList ?? '',
            description: info ?? '',
        })
    }

    account = null

    explore = [{
        title: "nayfun最新",

        type: "mixed",

        load: async (page) => {
            let res = await Network.get(`https://www.nyadm.net/map`,{"User-Agent": 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let animeList = []
            let animes = animeDivs.map(a => this.parseAnime(a))
            animeList.push(animes)
            return {
                data: animeList,
                maxPage: 20000
            }  // 返回包含所有动漫信息的数组
        }
    }]

    search = {
        load:async (keyword, page) => {
            let url = `${this.baseUrl}/search/${keyword}/page/${page}.html`
            let res = await Network.get(url, {})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let animes = []
            for (let div of animeDivs){
                let id = div.querySelector('a.public-list-exp').attributes['href'].trim() ?? ''
                let image = div.querySelector('a.public-list-exp img').attributes['data-src'].trim() ?? ''
                let title = div.querySelector('.thumb-txt.cor4.hide').text.trim() ?? ''
                let info = div.querySelector('.public-list-prb.hide.ft2').text.trim() ?? ''
                let category = div.querySelector('.thumb-else.cor5.hide').querySelectorAll('a').map(a => a.text.trim())
                animes.push({
                    id: id,
                    title: title,
                    subtitle: '',
                    cover: this.baseUrl + image,
                    tags: category,
                    description: info,
                })
            }
            return {
                animes: animes,
                maxPage: 999
            }
        }
    }

    anime = {
        loadInfo: async (id) => {
            let result = id.match(/\d+/)
            let res = await Network.get(`${this.baseUrl}${result}`,{"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let titleElement = document.querySelector('h3.slide-info-title.hide')
            let title = titleElement.text.trim() ?? ''
            let descriptionElement = document.querySelector('#height_limit.text.cor3')
            let description = descriptionElement.text.trim() ?? ''
            let director = extractLinksAfterStrong(document, '导演')
            let actors = extractLinksAfterStrong(document, '演员')
            let tags = extractLinksAfterStrong(document, '类型')
            let imageElement = document.querySelector('div.detail-pic img')
            let imageUrl = imageElement.attributes['data-src'] ?? ''
            let episodeElements = document.querySelectorAll('.anthology-list-play li a')
            let ep = new Map()
            let ep2 = new Map()
            for (let e of episodeElements) {
                let link = e.attributes['href']?.trim() ?? '';
                let title = e.text.trim() ?? '';

                if (title.length === 0) {
                    title = `第${ep.size + 1}話`;
                }

                // Extracting the number after the first dash in the link
                const splitLink = link.split("-");
                if (splitLink.length >= 2) {
                    const episodeNumber = parseInt(splitLink[1]);

                    // Checking if the episode number after the first dash is 1 or 2
                    if (episodeNumber === 1) {
                        ep.set(link, title);

                    } else if (episodeNumber === 2) {
                        ep2.set(link, title);

                    }
                }
            }
            if (ep.size === 0) {
                ep.set('#', '第1話')
            }

            let eps = {
                "繁体": ep,
                "简体": ep2
            }

            let animes = animeDivs.map(a => {
                try {
                    return this.parseAnime(a);  // 调用解析函数
                } catch (e) {
                    console.error("Error parsing anime:", e);  // 打印错误信息
                    return null;  // 出错时返回 null 或其他默认值，跳过当前元素
                }
            }).filter(anime => anime !== null);  // 使用 filter 去除 null 值

            return new AnimeDetails({
                id: id,
                title: title,
                cover: imageUrl,
                description: description,
                tags: {
                    "导演": director,
                    "演员": actors,
                    "类型": tags,
                },
                episode: eps,
                recommend: animes,
                url: this.baseUrl + id,
            })
        },

        loadEp: async (animeId, epId) => {
            let res = await Network.get(`${this.baseUrl}${epId}`,{})
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            let document = new HtmlDocument(res.body)
            let div = document.querySelector('.player-left') || document.querySelector('.player-top')
            let scriptContent = div.querySelector('script').text;
            let scriptLines = scriptContent.split(',').map(line => line.trim());
            for (let line of scriptLines) {
                if (line.includes('"url"')) {
                    let encoded = line.split(':')[1].replace(/"/g, '').replace(/,/g, '');
                    let decoded = Convert.decodeBase64(encoded)
                    let urlEncoded = Convert.decodeUtf8(decoded);
                    return decodeURIComponent(urlEncoded)
                }
            }
        },

        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }

}
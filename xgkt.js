/** @type {import('./_kostori_.js')} */
class Xgkt extends AnimeSource {

    name = "xgkt"

    isBangumi = true

    key = "xgkt"

    version = "1.0.3"

    minAppVersion = "1.0.0"

    // update url
    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/xgkt.js"


    init() {

    }

    get baseUrl() {
        return `https://cn.xgcartoon.com/`
    }

    get headers() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
    }

    get baseApiUrl() {
        return 'https://cn.xgcartoon.com/api/amp_query_cartoon_list'
    }

    async queryJson(region, page) {

        let res = await Network.get(
            this.baseApiUrl + `?type=*&region=${region}&filter=*&filter=*,*,*&page=${page}&limit=36&language=cn`,
            this.headers
        )

        if (res.status !== 200) {
            throw `Invalid Status Code ${res.status}`
        }

        return JSON.parse(res.body)
    }

    async queryAnimes(region, page) {
        let json = await this.queryJson(region, page)

        function parseAnimed(anime) {

            return new Anime(
                {
                    id: String(anime.cartoon_id),
                    title: anime.name,
                    subTitle: anime.author,
                    cover: 'https://static-a.xgcartoon.com/cover/' + anime.topic_img,
                    tags: anime.type_names,
                    description: anime.author
                }
            )
        }

        let animeList = []
        let animes = json.items.map(a => parseAnimed(a))
        animeList.push(animes)
        return {
            data: animeList,
            maxPage: null
        }
    }

    parseAnime(a) {
        let link = a.querySelector('a.cover');
        let image = link.querySelector('amp-img')?.attributes['src']?.trim() ?? '';

        let titleElement = a.querySelector('a.title h3');
        let name = titleElement?.text.trim() ?? '';

        let info = a.querySelector('.info .author')?.text.trim() ?? '';

        let id = link?.attributes['href']?.trim() ?? '';
        id = id.split('/').pop(); // 获取最后一段作为 id

        return new Anime({
            id: id,
            title: name,
            subtitle: info ?? '',
            cover: image ?? '',
            tags: [],
            description: info ?? '',
        });
    }


    explore = [
        {
            title: "西瓜卡通日番",
            type: "mixed",
            load: async (page) => {
                return  await this.queryAnimes('jp', page)
            },
        },
        {
            title: "西瓜卡通国番",
            type: "mixed",
            load: async (page) => {
                return  await this.queryAnimes('cn', page)
            },
        },
    ]

    search = {
        load: async (keyword,searchOption,page) => {
            let url = `${this.baseUrl}search?q=${keyword}`
            let res = await Network.get(url, this.headers,)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animes = [];
            let animeDivs = document.querySelectorAll('div.topic-list-box');

            for (let div of animeDivs) {
                let aTag = div.querySelector('a.topic-list-item');
                let id = aTag?.attributes['href']?.trim() ?? '';
                let image = div.querySelector('amp-img')?.attributes['src']?.trim() ?? '';
                let title = div.querySelector('.h3')?.text.trim() ?? '';
                let info = div.querySelector('.topic-list-item--author')?.text.trim() ?? '';
                let tagElements = div.querySelectorAll('.tag.tag-secondary');
                let category = tagElements.map(el => el.text.trim());

                animes.push({
                    id: id.split('/').pop(),
                    title: title,
                    subtitle: '',
                    cover: image,
                    tags: category,
                    description: info,
                });
            }
            document.dispose()
            return {
                animes: animes,
                maxPage: 1
            }
        },

    }

    /// single anime related
    anime = {

        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}detail/${id}`,{},)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.index-hot-item')
            let titleElement = document.querySelector('h1.h1')
            let title = titleElement.text.trim() ?? ''
            let descriptionElement = document.querySelector('.detail-right__desc p');
            let description = descriptionElement?.text.trim() ?? '';
            let tagElements = document.querySelectorAll('.detail-right__tags .tag.tag-secondary');
            let tags = Array.from(tagElements).map(el => el.text.trim());
            let imageElement = document.querySelector('amp-img');
            let imageUrl = imageElement?.attributes['src'] ?? '';
            let episodeElements = document.querySelectorAll('a.goto-chapter');
            let ep = new Map();

            for (let e of episodeElements) {
                let link = e.attributes['href']?.trim() ?? '';
                let title = e.text.trim() ?? '';

                if (title.length === 0) {
                    title = `第${ep.size + 1}話`;
                }

                ep.set(link, title);
            }

            if (ep.size === 0) {
                ep.set('#', '第1話');
            }

            let eps = {
                "西瓜卡通": ep
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
                id: id.replace(/\D/g, ""),
                title: title,
                cover: imageUrl,
                description: description,
                tags: {
                    "类型": tags,
                },
                episode: eps,
                recommend: animes,
                url: this.baseUrl + 'detail/' + id,
            })

        },
        loadEp: async (animeId, epId) => {
            let cleanEpId = epId.replace(/&amp;/g, '&');

            let cartoonIdMatch = cleanEpId.match(/cartoon_id=([^&]+)/);
            let chapterIdMatch = cleanEpId.match(/chapter_id=([^&]+)/);

            if (!cartoonIdMatch || !chapterIdMatch) {
                throw new Error('epId 中未找到 cartoon_id 或 chapter_id');
            }

            let cartoonId = cartoonIdMatch[1];
            let chapterId = chapterIdMatch[1];

            let res = await Network.get(`https://www.lincartoon.com/video/${cartoonId}/${chapterId}.html`, {});

            if (res.status !== 200) {
                throw new Error("Invalid status code: " + res.status);
            }

            let doc = new HtmlDocument(res.body); // Kostori HtmlDocument

            let iframe = doc.querySelector('#video_content iframe');
            if (!iframe) {
                throw new Error("未获取到播放器 iframe");
            }

            let iframeSrc = iframe.attributes['src']?.trim() ?? '';
            if (!iframeSrc) {
                throw new Error("未获取到 iframe src");
            }

            let iframeSrcTrim = iframeSrc.trim();
            if (!iframeSrcTrim) {
                throw new Error("iframe src 为空");
            }

            let vidMatch = iframeSrcTrim.match(/[?&]vid=([^&]+)/);
            if (vidMatch) {
                let vid = decodeURIComponent(vidMatch[1]);
                doc.dispose()
                return `https://xgct-video.vzcdn.net/${vid}/playlist.m3u8`;
            }

            let iframeUrl = iframeSrcTrim;
            if (!iframeSrcTrim.startsWith('http://') && !iframeSrcTrim.startsWith('https://')) {
                iframeUrl = 'https://www.lincartoon.com' + (iframeSrcTrim.startsWith('/') ? '' : '/') + iframeSrcTrim;
            }

            let innerRes = await Network.get(iframeUrl, {});

            if (innerRes.status !== 200) {
                throw new Error("Invalid iframe status code: " + innerRes.status);
            }

            let innerDoc = new HtmlDocument(innerRes.body);

            let source = innerDoc.querySelector('source');
            let videoUrl = source?.attributes['src']?.trim();

            if (!videoUrl) {
                throw new Error("未获取到 video source");
            }
            doc.dispose()
            innerDoc.dispose()
            return videoUrl;

        },

        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },

    }

}
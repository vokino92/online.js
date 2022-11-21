//16.11.2022 - Temporally hide hdvb

(function () {
  'use strict';

  function _typeof(obj) {
    "@babel/helpers - typeof";

    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    }, _typeof(obj);
  }

  function videocdn(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var results = [];
    var object = _object;
    var select_title = '';
    var get_links_wait = false;
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: '',
      voice_id: 0
    };
    /**
     * Начать поиск
     * @param {Object} _object 
     * @param {String} kinopoisk_id
     */

    this.search = function (_object, kinopoisk_id, data) {
      object = _object;
      var itm = data[0];
      select_title = itm.title || object.movie.title;
      var prox = component.proxy('videocdn');
      var url = prox ? prox + 'https://videocdn.tv/api/' : 'http://cdn.svetacdn.in/api/';
      var type = itm.iframe_src.split('/').slice(-2)[0];
      if (type == 'movie') type = 'movies';
      if (type == 'anime') type = 'animes';
      url += type;
      url = Lampa.Utils.addUrlComponent(url, 'api_token=3i40G5TSECmLF77oAqnEgbx61ZWaOYaE');
      url = Lampa.Utils.addUrlComponent(url, itm.imdb_id ? 'imdb_id=' + encodeURIComponent(itm.imdb_id) : 'title=' + encodeURIComponent(select_title));
      url = Lampa.Utils.addUrlComponent(url, 'field=' + encodeURIComponent('global'));
      network.clear();
      network.timeout(20000);
      network.silent(url, function (found) {
        results = found.data.filter(function (elem) {
          return elem.id == itm.id;
        });
        success(results);
        component.loading(false);
        if (!results.length) component.emptyForQuery(select_title);
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: '',
        voice_id: 0
      };
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type 
     * @param {*} a 
     * @param {*} b 
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;

      if (a.stype == 'voice') {
        choice.voice_name = filter_items.voice[b.index];
        choice.voice_id = filter_items.voice_info[b.index] && filter_items.voice_info[b.index].id;
      }

      component.reset();
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
      results = null;
    };
    /**
     * Успешно, есть данные
     * @param {Object} json 
     */


    function success(json) {
      results = json;
      extractData(json);
      filter();
      append(filtred());
    }
    /**
     * Получить потоки
     * @param {String} str 
     * @returns array
     */


    function extractItems(str) {
      try {
        var items = component.parsePlaylist(str).map(function (item) {
          var quality = item.label.match(/(\d\d\d+)p/);
          var file = item.links[0];
          if (file) file = 'http:' + file;
          return {
            label: item.label,
            quality: quality ? parseInt(quality[1]) : NaN,
            file: file || ''
          };
        });
        items.sort(function (a, b) {
          if (b.quality > a.quality) return 1;
          if (b.quality < a.quality) return -1;
          if (b.label > a.label) return 1;
          if (b.label < a.label) return -1;
          return 0;
        });
        return items;
      } catch (e) {}

      return [];
    }
    /**
     * Получить информацию о фильме
     * @param {Arrays} results 
     */


    function extractData(results) {
      var movie = results.slice(0, 1)[0];
      extract = {};

      if (movie) {
        get_links_wait = true;
        var src = movie.iframe_src;
        network.clear();
        network.timeout(20000);
        network.silent('http:' + src, function (raw) {
          get_links_wait = false;
          component.render().find('.broadcast__scan').remove();
          var math = raw.replace(/\n/g, '').match(/id="files" value="(.*?)"/);

          if (math) {
            var text = document.createElement("textarea");
            text.innerHTML = math[1];
            var json = Lampa.Arrays.decodeJson(text.value, {});

            for (var i in json) {
              if (0 === i - 0) {
                continue;
              }

              extract[i] = {
                json: _typeof(json[i]) === 'object' ? json[i] : Lampa.Arrays.decodeJson(json[i], {}),
                items: extractItems(json[i])
              };

              for (var a in extract[i].json) {
                var elem = extract[i].json[a];

                if (elem.folder) {
                  for (var f in elem.folder) {
                    var folder = elem.folder[f];
                    folder.items = extractItems(folder.file);
                  }
                } else elem.items = extractItems(elem.file);
              }
            }
          }
        }, function () {
          get_links_wait = false;
          component.render().find('.broadcast__scan').remove();
        }, false, {
          dataType: 'text'
        });
      }
    }
    /**
     * Найти поток
     * @param {Object} element 
     * @param {Int} max_quality
     * @returns string
     */


    function getFile(element, max_quality) {
      var translat = extract[element.translation];
      var id = element.season + '_' + element.episode;
      var file = '';
      var items = [];
      var quality = false;

      if (translat) {
        if (element.season) {
          for (var i in translat.json) {
            var elem = translat.json[i];

            if (elem.folder) {
              for (var f in elem.folder) {
                var folder = elem.folder[f];

                if (folder.id == id) {
                  items = folder.items;
                  break;
                }
              }
            } else if (elem.id == id) {
              items = elem.items;
              break;
            }
          }
        } else {
          items = translat.items;
        }
      }

      if (items && items.length) {
        max_quality = parseInt(max_quality);

        if (max_quality) {
          items = items.filter(function (item) {
            return item.quality <= max_quality;
          });
        }

        if (items.length) {
          file = items[0].file;
          quality = {};
          items.forEach(function (item) {
            quality[item.label] = item.file;
          });
          var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
          if (quality[preferably]) file = quality[preferably];
        }
      }

      return {
        file: file,
        quality: quality
      };
    }
    /**
     * Построить фильтр
     */


    function filter() {
      filter_items = {
        season: [],
        voice: [],
        voice_info: []
      };
      results.slice(0, 1).forEach(function (movie) {
        if (movie.season_count) {
          var s = movie.season_count;

          while (s--) {
            filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + (movie.season_count - s));
          }
        }

        if (!filter_items.season[choice.season]) choice.season = 0;

        if (movie.episodes) {
          movie.episodes.forEach(function (episode) {
            if (episode.season_num == choice.season + 1) {
              episode.media.forEach(function (media) {
                if (!filter_items.voice_info.find(function (v) {
                  return v.id == media.translation.id;
                })) {
                  filter_items.voice.push(media.translation.shorter_title);
                  filter_items.voice_info.push({
                    id: media.translation.id
                  });
                }
              });
            }
          });
        }
      });
      if (!filter_items.season[choice.season]) choice.season = 0;
      if (!filter_items.voice[choice.voice]) choice.voice = 0;

      if (choice.voice_name) {
        var inx = -1;

        if (choice.voice_id) {
          var voice = filter_items.voice_info.find(function (v) {
            return v.id == choice.voice_id;
          });
          if (voice) inx = filter_items.voice_info.indexOf(voice);
        }

        if (inx == -1) inx = filter_items.voice.indexOf(choice.voice_name);
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }
    /**
     * Отфильтровать файлы
     * @returns array
     */


    function filtred() {
      var filtred = [];
      results.slice(0, 1).forEach(function (movie) {
        if (movie.episodes) {
          movie.episodes.forEach(function (episode) {
            if (episode.season_num == choice.season + 1) {
              var temp = episode.media.filter(function (m) {
                return filter_items.voice_info[choice.voice] && m.translation.id == filter_items.voice_info[choice.voice].id;
              });
              temp.sort(function (a, b) {
                return b.max_quality - a.max_quality;
              });
              temp.slice(0, 1).forEach(function (media) {
                filtred.push({
                  episode: parseInt(episode.num),
                  season: episode.season_num,
                  title: 'S' + episode.season_num + ' / ' + Lampa.Lang.translate('torrent_serial_episode') + ' ' + episode.num + ' - ' + (episode.ru_title || episode.orig_title),
                  quality: media.max_quality + 'p',
                  info: ' / ' + filter_items.voice[choice.voice],
                  max_quality: media.max_quality,
                  translation: media.translation_id
                });
              });
            }
          });
        } else if (movie.media) {
          movie.media.forEach(function (element) {
            filtred.push({
              title: element.translation.title,
              quality: element.max_quality + 'p' + (element.source_quality ? ' - ' + element.source_quality.toUpperCase() : ''),
              info: '',
              max_quality: element.max_quality,
              translation: element.translation_id
            });
          });
        }
      });
      return filtred;
    }
    /**
     * Добавить видео
     * @param {Array} items 
     */


    function append(items) {
      component.reset();
      if (get_links_wait) component.append($('<div class="broadcast__scan"><div></div></div>'));
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      var last_episode = component.getLastEpisode(items);
      items.forEach(function (element) {
        if (element.season) {
          element.translate_episode_end = last_episode;
          element.translate_voice = filter_items.voice[choice.voice];
        }

        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
        item.addClass('video--stream');
        element.timeline = view;
        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          var extra = getFile(element, element.max_quality);

          if (extra.file) {
            var playlist = [];
            var first = {
              url: extra.file,
              quality: extra.quality,
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + ' / ' + element.title
            };

            if (element.season) {
              items.forEach(function (elem) {
                var ex = getFile(elem, elem.max_quality);
                playlist.push({
                  url: ex.file,
                  quality: ex.quality,
                  timeline: elem.timeline,
                  title: elem.title
                });
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          } else Lampa.Noty.show(Lampa.Lang.translate(get_links_wait ? 'online_mod_waitlink' : 'online_mod_nolink'));
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          element: element,
          file: function file(call) {
            call(getFile(element, element.max_quality));
          }
        });
      });
      component.start(true);
    }
  }

  function rezka(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var prox = component.proxy('rezka');
    var embed = prox ? prox + 'http://voidboost.tv/' : 'https://voidboost.tv/';
    var object = _object;
    var select_title = '';
    var select_id = '';
    var prefer_mp4 = Lampa.Storage.field('online_mod_prefer_mp4') === true;
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: ''
    };
    /**
     * Поиск
     * @param {Object} _object 
     */

    this.search = function (_object, kinopoisk_id) {
      object = _object;
      select_id = kinopoisk_id;
      select_title = object.movie.title;
      getFirstTranlate(kinopoisk_id, function (voice) {
        getFilm(kinopoisk_id, voice);
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: ''
      };
      component.loading(true);
      getFirstTranlate(select_id, function (voice) {
        getFilm(select_id, voice);
      });
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type 
     * @param {*} a 
     * @param {*} b 
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      if (a.stype == 'voice') choice.voice_name = filter_items.voice[b.index];
      component.reset();
      filter();
      component.loading(true);
      choice.voice_token = extract.voice[choice.voice].token;
      getFilm(select_id, choice.voice_token);
      component.saveChoice(choice);
      setTimeout(component.closeFilter, 10);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
      extract = null;
    };

    function getSeasons(voice, call) {
      var url = embed + 'serial/' + voice + '/iframe?h=gidonline.io';
      network.clear();
      network.timeout(10000);
      network["native"](url, function (str) {
        extractData(str);
        call();
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      }, false, {
        dataType: 'text'
      });
    }

    function getChoiceVoice() {
      var res = extract.voice[0];

      if (choice.voice_token) {
        extract.voice.forEach(function (voice) {
          if (voice.token === choice.voice_token) res = voice;
        });
      }

      return res;
    }

    function getFirstTranlate(id, call) {
      network.clear();
      network.timeout(10000);
      network["native"](embed + 'embed/' + id, function (str) {
        extractData(str);
        if (extract.voice.length) call(getChoiceVoice().token);else component.emptyForQuery(select_title);
      }, function (a, c) {
        if (a.status == 404 && a.responseText && a.responseText.indexOf('Видео не найдено') !== -1) component.emptyForQuery(select_title);else component.empty(network.errorDecode(a, c));
      }, false, {
        dataType: 'text'
      });
    }

    function getEmbed(url) {
      network.clear();
      network.timeout(10000);
      network["native"](url, function (str) {
        component.loading(false);
        extractData(str);
        filter();
        append();
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      }, false, {
        dataType: 'text'
      });
    }
    /**
     * Запросить фильм
     * @param {Int} id 
     * @param {String} voice 
     */


    function getFilm(id, voice) {
      var url = embed;

      if (voice) {
        if (extract.season.length) {
          var ses = extract.season[Math.min(extract.season.length - 1, choice.season)].id;
          url += 'serial/' + voice + '/iframe?s=' + ses + '&h=gidonline.io';
          return getSeasons(voice, function () {
            var check = extract.season.filter(function (s) {
              return s.id == ses;
            });

            if (!check.length) {
              choice.season = extract.season.length - 1;
              url = embed + 'serial/' + voice + '/iframe?s=' + extract.season[choice.season].id + '&h=gidonline.io';
            }

            getEmbed(url);
          });
        } else {
          url += 'movie/' + voice + '/iframe?h=gidonline.io';
          getEmbed(url);
        }
      } else {
        url += 'embed/' + id;
        getEmbed(url);
      }
    }
    /**
     * Построить фильтр
     */


    function filter() {
      filter_items = {
        season: extract.season.map(function (v) {
          return v.name;
        }),
        voice: extract.season.length ? extract.voice.map(function (v) {
          return v.name;
        }) : []
      };
      if (!filter_items.season[choice.season]) choice.season = 0;
      if (!filter_items.voice[choice.voice]) choice.voice = 0;

      if (choice.voice_name) {
        var inx = filter_items.voice.indexOf(choice.voice_name);
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }

    function parseSubtitles(str) {
      var subtitles = [];
      var subtitle = str.match("'subtitle': '(.*?)'");

      if (subtitle) {
        subtitles = component.parsePlaylist(subtitle[1]).map(function (item) {
          return {
            label: item.label,
            url: item.links[0]
          };
        });
      }

      return subtitles.length ? subtitles : false;
    }
    /**
     * Получить потоки
     * @param {String} str 
     * @returns array
     */


    function extractItems(str) {
      try {
        var items = component.parsePlaylist(str).map(function (item) {
          var quality = item.label.match(/(\d\d\d+)p/);
          var links;

          if (prefer_mp4) {
            links = item.links.filter(function (url) {
              return /\.mp4$/i.test(url);
            });
          } else {
            links = item.links.filter(function (url) {
              return /\.m3u8$/i.test(url);
            });
          }

          if (!links.length) links = item.links;
          return {
            label: item.label,
            quality: quality ? parseInt(quality[1]) : NaN,
            file: links[0]
          };
        });
        items.sort(function (a, b) {
          if (b.quality > a.quality) return 1;
          if (b.quality < a.quality) return -1;
          if (b.label > a.label) return 1;
          if (b.label < a.label) return -1;
          return 0;
        });
        return items;
      } catch (e) {}

      return [];
    }
    /**
     * Получить поток
     * @param {*} element 
     */


    function getStream(element, call, error) {
      if (element.stream) return call(element);
      var url = embed;

      if (element.season) {
        url += 'serial/' + element.voice.token + '/iframe?s=' + element.season + '&e=' + element.episode + '&h=gidonline.io';
      } else {
        url += 'movie/' + element.voice.token + '/iframe?h=gidonline.io';
      }

      network.clear();
      network.timeout(5000);
      network["native"](url, function (str) {
        var videos = str.match("'file': '(.*?)'");

        if (videos) {
          var video = decode(videos[1]),
              file = '',
              quality = false;
          var items = extractItems(video);

          if (items && items.length) {
            file = items[0].file;
            quality = {};
            items.forEach(function (item) {
              quality[item.label] = item.file;
            });
            var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
            if (quality[preferably]) file = quality[preferably];
          }

          if (file) {
            element.stream = file;
            element.qualitys = quality;
            element.subtitles = parseSubtitles(str);
            call(element);
          } else error();
        } else error();
      }, error, false, {
        dataType: 'text'
      });
    }

    function decode(data) {
      if (data.charAt(0) !== '#') return data;

      var enc = function enc(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
          return String.fromCharCode('0x' + p1);
        }));
      };

      var dec = function dec(str) {
        return decodeURIComponent(atob(str).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
      };

      var trashList = ['$$$####!!!!!!!', '^^^^^^##@', '@!^^!@#@@$$$$$', '^^#@@!!@#!$', '@#!@@@##$$@@'];
      var x = data.substring(2);
      trashList.forEach(function (trash) {
        x = x.replace('//_//' + enc(trash), '');
      });

      try {
        x = dec(x);
      } catch (e) {
        x = '';
      }

      return x;
    }
    /**
     * Получить данные о фильме
     * @param {String} str 
     */


    function extractData(str) {
      extract.voice = [];
      extract.season = [];
      extract.episode = [];
      str = str.replace(/\n/g, '');
      var voices = str.match('<select name="translator"[^>]+>(.*?)</select>');
      var sesons = str.match('<select name="season"[^>]+>(.*?)</select>');
      var episod = str.match('<select name="episode"[^>]+>(.*?)</select>');

      if (sesons) {
        var select = $('<select>' + sesons[1] + '</select>');
        $('option', select).each(function () {
          extract.season.push({
            id: $(this).attr('value'),
            name: $(this).text()
          });
        });
      }

      if (voices) {
        var _select = $('<select>' + voices[1] + '</select>');

        $('option', _select).each(function () {
          var token = $(this).attr('data-token');

          if (token) {
            extract.voice.push({
              token: token,
              name: $(this).text(),
              id: $(this).val()
            });
          }
        });
      }

      if (episod) {
        var _select2 = $('<select>' + episod[1] + '</select>');

        $('option', _select2).each(function () {
          extract.episode.push({
            id: $(this).attr('value'),
            name: $(this).text()
          });
        });
      }
    }
    /**
     * Показать файлы
     */


    function append() {
      component.reset();
      var items = [];
      var viewed = Lampa.Storage.cache('online_view', 5000, []);

      if (extract.season.length) {
        var ses = extract.season[Math.min(extract.season.length - 1, choice.season)].id;
        var voice = getChoiceVoice();
        extract.episode.forEach(function (episode) {
          items.push({
            title: 'S' + ses + ' / ' + episode.name,
            quality: '360p ~ 1080p',
            season: parseInt(ses),
            episode: parseInt(episode.id),
            info: ' / ' + voice.name,
            voice: voice
          });
        });
      } else {
        extract.voice.forEach(function (voice) {
          items.push({
            title: voice.name.length > 3 ? voice.name : select_title,
            quality: '360p ~ 1080p',
            voice: voice,
            info: ''
          });
        });
      }

      var last_episode = component.getLastEpisode(items);
      items.forEach(function (element) {
        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, element.voice.name].join('') : object.movie.original_title + element.voice.name);
        element.timeline = view;

        if (element.season) {
          element.translate_episode_end = last_episode;
          element.translate_voice = element.voice.name;
        }

        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          getStream(element, function (element) {
            var first = {
              url: element.stream,
              quality: element.qualitys,
              subtitles: element.subtitles,
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + ' / ' + element.title
            };
            Lampa.Player.play(first);

            if (element.season && Lampa.Platform.version) {
              var playlist = [];
              items.forEach(function (elem) {
                if (elem == element) {
                  playlist.push(first);
                } else {
                  var cell = {
                    url: function url(call) {
                      getStream(elem, function (elem) {
                        cell.url = elem.stream;
                        cell.quality = elem.qualitys;
                        cell.subtitles = elem.subtitles;
                        call();
                      }, function () {
                        cell.url = '';
                        call();
                      });
                    },
                    timeline: elem.timeline,
                    title: elem.title
                  };
                  playlist.push(cell);
                }
              });
              Lampa.Player.playlist(playlist);
            } else {
              Lampa.Player.playlist([first]);
            }

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          }, function () {
            Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
          });
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          element: element,
          file: function file(call) {
            getStream(element, function (element) {
              call({
                file: element.stream,
                quality: element.qualitys
              });
            }, function () {
              Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
            });
          }
        });
      });
      component.start(true);
    }
  }

  function rezka2(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var prox = component.proxy('rezka2');
    var embed = prox ? prox + 'https://hdrezka.ag/' : rezka2Mirror();
    var object = _object;
    var select_title = '';
    var prefer_mp4 = Lampa.Storage.field('online_mod_prefer_mp4') === true;
    var logged_in = Lampa.Storage.field('online_mod_rezka2_status') === true && !prox;
    var network_call = logged_in ? network.silent : network["native"];
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: ''
    };

    function rezka2Mirror() {
      var url = Lampa.Storage.get('online_mod_rezka2_mirror', '');
      if (!url) return 'https://hdrezka.ag/';
      if (url.indexOf('://') == -1) url = 'https://' + url;
      if (url.charAt(url.length - 1) != '/') url += '/';
      return url;
    }
    /**
     * Поиск
     * @param {Object} _object
     */


    this.search = function (_object, kinopoisk_id, data) {
      var _this = this;

      if (this.wait_similars && data && data[0].is_similars) return getPage(data[0].link);
      object = _object;
      select_title = object.search || object.movie.title;
      var search_date = object.search_date || object.movie.release_date || object.movie.first_air_date || object.movie.last_air_date || '0000';
      var search_year = parseInt((search_date + '').slice(0, 4));
      var orig = object.movie.original_title || object.movie.original_name;
      var url = embed + 'engine/ajax/search.php';
      var postdata = 'q=' + encodeURIComponent(component.cleanTitle(select_title));
      network.clear();
      network.timeout(10000);
      network_call(url, function (str) {
        str = str.replace(/\n/g, '');
        var links = str.match(/<li><a href=.*?<\/li>/g);

        if (links) {
          var items = links.map(function (l) {
            var li = $(l);
            var link = $('a', li);
            var enty = $('.enty', link);
            var rating = $('.rating', link);
            var titl = enty.text().trim() || '';
            enty.remove();
            rating.remove();
            var alt_titl = link.text().trim() || '';
            var orig_title = '';
            var year;
            var found = alt_titl.match(/\((.*,\s*)?\b(\d{4})(\s*-\s*[\d.]*)?\)$/);

            if (found) {
              if (found[1]) {
                var found_alt = found[1].match(/^([^а-яА-ЯёЁ]+),/);
                if (found_alt) orig_title = found_alt[1].trim();
              }

              year = parseInt(found[2]);
            }

            return {
              year: year,
              title: titl,
              orig_title: orig_title,
              link: link.attr('href')
            };
          });
          var is_sure = false;
          var cards = items.filter(function (c) {
            return !c.year || !search_year || c.year > search_year - 2 && c.year < search_year + 2;
          });

          if (orig) {
            var tmp = cards.filter(function (c) {
              return component.equalTitle(c.orig_title, orig);
            });

            if (tmp.length) {
              cards = tmp;
              is_sure = true;
            }
          }

          if (select_title) {
            var _tmp = cards.filter(function (c) {
              return component.equalTitle(c.title, select_title);
            });

            if (_tmp.length) {
              cards = _tmp;
              is_sure = true;
            }
          }

          if (cards.length > 1 && search_year) {
            var _tmp2 = cards.filter(function (c) {
              return c.year == search_year;
            });

            if (_tmp2.length) cards = _tmp2;
          }

          if (cards.length == 1 && is_sure) getPage(cards[0].link);else if (items.length) {
            _this.wait_similars = true;
            items.forEach(function (c) {
              c.is_similars = true;
            });
            component.similars(items);
            component.loading(false);
          } else component.emptyForQuery(select_title);
        } else component.emptyForQuery(select_title);
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      }, postdata, {
        dataType: 'text',
        withCredentials: logged_in
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: ''
      };
      component.loading(true);
      getEpisodes(success);
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type
     * @param {*} a
     * @param {*} b
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      if (a.stype == 'voice') choice.voice_name = filter_items.voice[b.index];
      component.reset();
      filter();
      component.loading(true);
      getEpisodes(success);
      component.saveChoice(choice);
      setTimeout(component.closeFilter, 10);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
      extract = null;
    };

    function getPage(url) {
      network.clear();
      network.timeout(10000);
      network_call(prox + url, function (str) {
        extractData(str);

        if (extract.film_id) {
          getEpisodes(success);
        } else component.emptyForQuery(select_title);
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      }, false, {
        dataType: 'text',
        withCredentials: logged_in
      });
    }

    function success() {
      component.loading(false);
      filter();
      append(filtred());
    }
    /**
     * Получить данные о фильме
     * @param {String} str
     */


    function extractData(str) {
      extract.voice = [];
      extract.season = [];
      extract.episode = [];
      extract.voice_data = {};
      extract.is_series = false;
      extract.film_id = '';
      extract.favs = '';
      str = str.replace(/\n/g, '');
      var translation = str.match(/<h2>В переводе<\/h2>:<\/td>\s*(<td>.*?<\/td>)/);
      var cdnSeries = str.match(/\.initCDNSeriesEvents\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/);
      var cdnMovie = str.match(/\.initCDNMoviesEvents\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/);
      var devVoiceName;

      if (translation) {
        devVoiceName = $(translation[1]).text().trim();
      }

      if (!devVoiceName) devVoiceName = 'Оригинал';
      var defVoice, defSeason, defEpisode;

      if (cdnSeries) {
        extract.is_series = true;
        extract.film_id = cdnSeries[1];
        defVoice = {
          name: devVoiceName,
          id: cdnSeries[2]
        };
        defSeason = {
          name: 'Сезон ' + cdnSeries[3],
          id: cdnSeries[3]
        };
        defEpisode = {
          name: 'Серия ' + cdnSeries[4],
          season_id: cdnSeries[3],
          episode_id: cdnSeries[4]
        };
      } else if (cdnMovie) {
        extract.film_id = cdnMovie[1];
        defVoice = {
          name: devVoiceName,
          id: cdnMovie[2],
          is_camrip: cdnMovie[3],
          is_ads: cdnMovie[4],
          is_director: cdnMovie[5]
        };
      }

      var voices = str.match(/(<ul id="translators-list".*?<\/ul>)/);

      if (voices) {
        var select = $(voices[1]);
        $('.b-translator__item', select).each(function () {
          extract.voice.push({
            name: $(this).attr('title') || $(this).text(),
            id: $(this).attr('data-translator_id'),
            is_camrip: $(this).attr('data-camrip'),
            is_ads: $(this).attr('data-ads'),
            is_director: $(this).attr('data-director')
          });
        });
      }

      if (!extract.voice.length && defVoice) {
        extract.voice.push(defVoice);
      }

      if (extract.is_series) {
        var seasons = str.match(/(<ul id="simple-seasons-tabs".*?<\/ul>)/);

        if (seasons) {
          var _select = $(seasons[1]);

          $('.b-simple_season__item', _select).each(function () {
            extract.season.push({
              name: $(this).text(),
              id: $(this).attr('data-tab_id')
            });
          });
        }

        if (!extract.season.length && defSeason) {
          extract.season.push(defSeason);
        }

        var episodes = str.match(/(<div id="simple-episodes-tabs".*?<\/div>)/);

        if (episodes) {
          var _select2 = $(episodes[1]);

          $('.b-simple_episode__item', _select2).each(function () {
            extract.episode.push({
              name: $(this).text(),
              season_id: $(this).attr('data-season_id'),
              episode_id: $(this).attr('data-episode_id')
            });
          });
        }

        if (!extract.episode.length && defEpisode) {
          extract.episode.push(defEpisode);
        }
      }

      var favs = str.match(/<input type="hidden" id="ctrl_favs" value="([^"]*)"/);
      if (favs) extract.favs = favs[1];
    }

    function getEpisodes(call) {
      if (extract.is_series) {
        filterVoice();

        if (extract.voice[choice.voice]) {
          var translator_id = extract.voice[choice.voice].id;
          var data = extract.voice_data[translator_id];

          if (data) {
            extract.season = data.season;
            extract.episode = data.episode;
          } else {
            var url = embed + 'ajax/get_cdn_series/?t=' + Date.now();
            var postdata = 'id=' + encodeURIComponent(extract.film_id);
            postdata += '&translator_id=' + encodeURIComponent(translator_id);
            postdata += '&favs=' + encodeURIComponent(extract.favs);
            postdata += '&action=get_episodes';
            network.clear();
            network.timeout(10000);
            network_call(url, function (json) {
              extractEpisodes(json, translator_id);
              call();
            }, function (a, c) {
              component.empty(network.errorDecode(a, c));
            }, postdata, {
              withCredentials: logged_in
            });
            return;
          }
        }
      }

      call();
    }

    function extractEpisodes(json, translator_id) {
      var data = {
        season: [],
        episode: []
      };

      if (json.seasons) {
        var select = $('<ul>' + json.seasons + '</ul>');
        $('.b-simple_season__item', select).each(function () {
          data.season.push({
            name: $(this).text(),
            id: $(this).attr('data-tab_id')
          });
        });
      }

      if (json.episodes) {
        var _select3 = $('<div>' + json.episodes + '</div>');

        $('.b-simple_episode__item', _select3).each(function () {
          data.episode.push({
            name: $(this).text(),
            translator_id: translator_id,
            season_id: $(this).attr('data-season_id'),
            episode_id: $(this).attr('data-episode_id')
          });
        });
      }

      extract.voice_data[translator_id] = data;
      extract.season = data.season;
      extract.episode = data.episode;
    }

    function filterVoice() {
      var voice = extract.is_series ? extract.voice.map(function (v) {
        return v.name;
      }) : [];
      if (!voice[choice.voice]) choice.voice = 0;

      if (choice.voice_name) {
        var inx = voice.indexOf(choice.voice_name);
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }
    }
    /**
     * Построить фильтр
     */


    function filter() {
      filter_items = {
        season: extract.season.map(function (v) {
          return v.name;
        }),
        voice: extract.is_series ? extract.voice.map(function (v) {
          return v.name;
        }) : []
      };
      if (!filter_items.season[choice.season]) choice.season = 0;
      if (!filter_items.voice[choice.voice]) choice.voice = 0;

      if (choice.voice_name) {
        var inx = filter_items.voice.indexOf(choice.voice_name);
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }
    /**
     * Получить поток
     * @param {*} element
     */


    function getStream(element, call, error) {
      if (element.stream) return call(element);
      var url = embed + 'ajax/get_cdn_series/?t=' + Date.now();
      var postdata = 'id=' + encodeURIComponent(extract.film_id);

      if (extract.is_series) {
        postdata += '&translator_id=' + encodeURIComponent(element.media.translator_id);
        postdata += '&season=' + encodeURIComponent(element.media.season_id);
        postdata += '&episode=' + encodeURIComponent(element.media.episode_id);
        postdata += '&favs=' + encodeURIComponent(extract.favs);
        postdata += '&action=get_stream';
      } else {
        postdata += '&translator_id=' + encodeURIComponent(element.media.id);
        postdata += '&is_camrip=' + encodeURIComponent(element.media.is_camrip);
        postdata += '&is_ads=' + encodeURIComponent(element.media.is_ads);
        postdata += '&is_director=' + encodeURIComponent(element.media.is_director);
        postdata += '&favs=' + encodeURIComponent(extract.favs);
        postdata += '&action=get_movie';
      }

      network.clear();
      network.timeout(10000);
      network_call(url, function (json) {
        if (json.url) {
          var video = decode(json.url),
              file = '',
              quality = false;
          var items = extractItems(video);

          if (items && items.length) {
            file = items[0].file;
            quality = {};
            items.forEach(function (item) {
              quality[item.label] = item.file;
            });
            var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
            if (quality[preferably]) file = quality[preferably];
          }

          if (file) {
            element.stream = file;
            element.qualitys = quality;
            element.subtitles = parseSubtitles(json.subtitle);
            call(element);
          } else error();
        } else error();
      }, error, postdata, {
        withCredentials: logged_in
      });
    }

    function decode(data) {
      if (data.charAt(0) !== '#') return data;

      var enc = function enc(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
          return String.fromCharCode('0x' + p1);
        }));
      };

      var dec = function dec(str) {
        return decodeURIComponent(atob(str).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
      };

      var trashList = ['$$!!@$$@^!@#$$@', '@@@@@!##!^^^', '####^!!##!@@', '^^^!@##!!##', '$$#!!@#!@##'];
      var x = data.substring(2);
      trashList.forEach(function (trash) {
        x = x.replace('//_//' + enc(trash), '');
      });

      try {
        x = dec(x);
      } catch (e) {
        x = '';
      }

      return x;
    }
    /**
     * Получить потоки
     * @param {String} str
     * @returns array
     */


    function extractItems(str) {
      try {
        var items = component.parsePlaylist(str).map(function (item) {
          var quality = item.label.match(/(\d\d\d+)p/);
          var links;

          if (prefer_mp4) {
            links = item.links.filter(function (url) {
              return /\.mp4$/i.test(url);
            });
          } else {
            links = item.links.filter(function (url) {
              return /\.m3u8$/i.test(url);
            });
          }

          if (!links.length) links = item.links;
          return {
            label: item.label,
            quality: quality ? parseInt(quality[1]) : NaN,
            file: links[0]
          };
        });
        items.sort(function (a, b) {
          if (b.quality > a.quality) return 1;
          if (b.quality < a.quality) return -1;
          if (b.label > a.label) return 1;
          if (b.label < a.label) return -1;
          return 0;
        });
        return items;
      } catch (e) {}

      return [];
    }

    function parseSubtitles(str) {
      var subtitles = [];

      if (str) {
        subtitles = component.parsePlaylist(str).map(function (item) {
          return {
            label: item.label,
            url: item.links[0]
          };
        });
      }

      return subtitles.length ? subtitles : false;
    }
    /**
     * Отфильтровать файлы
     * @returns array
     */


    function filtred() {
      var filtred = [];

      if (extract.is_series) {
        var season_name = filter_items.season[choice.season];
        var season_id;
        extract.season.forEach(function (season) {
          if (season.name == season_name) season_id = season.id;
        });
        var voice = filter_items.voice[choice.voice];
        extract.episode.forEach(function (episode) {
          if (episode.season_id == season_id) {
            filtred.push({
              title: 'S' + episode.season_id + ' / ' + episode.name,
              quality: '360p ~ 1080p',
              season: parseInt(episode.season_id),
              episode: parseInt(episode.episode_id),
              info: ' / ' + voice,
              media: episode
            });
          }
        });
      } else {
        extract.voice.forEach(function (voice) {
          filtred.push({
            title: voice.name,
            quality: '360p ~ 1080p',
            info: '',
            media: voice
          });
        });
      }

      return filtred;
    }
    /**
     * Показать файлы
     */


    function append(items) {
      component.reset();
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      var last_episode = component.getLastEpisode(items);
      items.forEach(function (element) {
        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
        element.timeline = view;

        if (element.season) {
          element.translate_episode_end = last_episode;
          element.translate_voice = filter_items.voice[choice.voice];
        }

        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          getStream(element, function (element) {
            var first = {
              url: element.stream,
              quality: element.qualitys,
              subtitles: element.subtitles,
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + ' / ' + element.title
            };
            Lampa.Player.play(first);

            if (element.season && Lampa.Platform.version) {
              var playlist = [];
              items.forEach(function (elem) {
                if (elem == element) {
                  playlist.push(first);
                } else {
                  var cell = {
                    url: function url(call) {
                      getStream(elem, function (elem) {
                        cell.url = elem.stream;
                        cell.quality = elem.qualitys;
                        cell.subtitles = elem.subtitles;
                        call();
                      }, function () {
                        cell.url = '';
                        call();
                      });
                    },
                    timeline: elem.timeline,
                    title: elem.title
                  };
                  playlist.push(cell);
                }
              });
              Lampa.Player.playlist(playlist);
            } else {
              Lampa.Player.playlist([first]);
            }

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          }, function () {
            Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
          });
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          element: element,
          file: function file(call) {
            getStream(element, function (element) {
              call({
                file: element.stream,
                quality: element.qualitys
              });
            }, function () {
              Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
            });
          }
        });
      });
      component.start(true);
    }
  }

  function kinobase(component, _object) {
    var network = new Lampa.Reguest();
    var extract = [];
    var embed = component.proxy('kinobase') + 'https://kinobase.org/';
    var object = _object;
    var select_title = '';
    var select_id = '';
    var is_playlist = false;
    var quality_type = '';
    var translation = '';
    var prefer_mp4 = Lampa.Storage.field('online_mod_prefer_mp4') === true;
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0
    };
    /**
     * Поиск
     * @param {Object} _object
     * @param {String} kinopoisk_id
     */

    this.search = function (_object, kinopoisk_id, data) {
      var _this = this;

      if (this.wait_similars && data && data[0].is_similars) return getPage(data[0].link);
      object = _object;
      select_title = object.search || object.movie.title;
      var url = embed + "search?query=" + encodeURIComponent(component.cleanTitle(select_title));
      network.clear();
      network.timeout(1000 * 10);
      network["native"](url, function (str) {
        str = str.replace(/\n/g, '');
        var links = object.movie.number_of_seasons ? str.match(/<a href="\/serial\/([^"]*)" class="link"[^>]*>(.*?)<\/a>/g) : str.match(/<a href="\/film\/([^"]*)" class="link"[^>]*>(.*?)<\/a>/g);
        var search_date = object.search_date || object.movie.release_date || object.movie.first_air_date || object.movie.last_air_date || '0000';
        var search_year = parseInt((search_date + '').slice(0, 4));

        if (links) {
          var items = links.map(function (l) {
            var link = $(l),
                titl = link.attr('title') || link.text() || '';
            var year;
            var found = titl.match(/^(.*)\((\d{4})\)$/);

            if (found) {
              year = parseInt(found[2]);
              titl = found[1].trim();
            }

            return {
              year: year,
              title: titl,
              link: link.attr('href')
            };
          });
          var is_sure = false;
          var cards = items.filter(function (c) {
            return !c.year || !search_year || c.year > search_year - 2 && c.year < search_year + 2;
          });

          if (select_title) {
            var tmp = cards.filter(function (c) {
              return component.equalTitle(c.title, select_title);
            });

            if (tmp.length) {
              cards = tmp;
              is_sure = true;
            }
          }

          if (cards.length > 1 && search_year) {
            var _tmp = cards.filter(function (c) {
              return c.year == search_year;
            });

            if (_tmp.length) cards = _tmp;
          }

          if (cards.length == 1 && is_sure) getPage(cards[0].link);else if (items.length) {
            _this.wait_similars = true;
            items.forEach(function (c) {
              c.is_similars = true;
            });
            component.similars(items);
            component.loading(false);
          } else component.emptyForQuery(select_title);
        } else component.emptyForQuery(select_title);
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      }, false, {
        dataType: 'text'
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0
      };
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type
     * @param {*} a
     * @param {*} b
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      component.reset();
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
      extract = null;
    };

    function filter() {
      filter_items = {
        season: [],
        voice: [],
        quality: []
      };

      if (is_playlist) {
        extract.forEach(function (item) {
          if (item.playlist) {
            filter_items.season.push(item.comment);
          }
        });
      }

      if (!filter_items.season[choice.season]) choice.season = 0;

      if (is_playlist) {
        extract.forEach(function (item, i) {
          if (item.playlist) {
            if (i == choice.season) {
              item.playlist.forEach(function (eps) {
                if (eps.file) {
                  component.parsePlaylist(eps.file).forEach(function (el) {
                    if (el.voice && filter_items.voice.indexOf(el.voice) == -1) {
                      filter_items.voice.push(el.voice);
                    }
                  });
                }
              });
            }
          } else if (item.file) {
            component.parsePlaylist(item.file).forEach(function (el) {
              if (el.voice && filter_items.voice.indexOf(el.voice) == -1) {
                filter_items.voice.push(el.voice);
              }
            });
          }
        });
      }

      if (!filter_items.voice[choice.voice]) choice.voice = 0;
      component.filter(filter_items, choice);
    }

    function filtred() {
      var filtred = [];

      if (is_playlist) {
        var playlist = extract;
        var season = object.movie.number_of_seasons && 1;

        if (extract[choice.season] && extract[choice.season].playlist) {
          playlist = extract[choice.season].playlist;
          season = parseInt(extract[choice.season].comment);
          if (isNaN(season)) season = 1;
        }

        playlist.forEach(function (eps, index) {
          var items = extractItems(eps.file, filter_items.voice[choice.voice]);

          if (items.length) {
            var alt_voice = eps.comment.match(/\d+ серия (.*)$/i);
            var info = items[0].voice || alt_voice && alt_voice[1].trim() || translation;
            if (info == eps.comment) info = '';

            if (season) {
              var episode = parseInt(eps.comment);
              if (isNaN(episode)) episode = index + 1;
              filtred.push({
                file: eps.file,
                season: season,
                episode: episode,
                title: 'S' + season + ' / ' + eps.comment,
                quality: items[0].quality + 'p' + (quality_type ? ' - ' + quality_type : ''),
                info: info ? ' / ' + info : '',
                voice: items[0].voice,
                subtitles: parseSubs(eps.subtitle || '')
              });
            } else {
              filtred.push({
                file: eps.file,
                title: eps.comment,
                quality: items[0].quality + 'p' + (quality_type ? ' - ' + quality_type : ''),
                info: info ? ' / ' + info : '',
                voice: items[0].voice,
                subtitles: parseSubs(eps.subtitle || '')
              });
            }
          }
        });
      } else {
        filtred = extract;
      }

      return filtred;
    }

    function parseSubs(vod) {
      var subtitles = component.parsePlaylist(vod).map(function (item) {
        return {
          label: item.label,
          url: item.links[0]
        };
      });
      return subtitles.length ? subtitles : false;
    }
    /**
     * Получить данные о фильме
     * @param {String} str
     */


    function extractData(str, page) {
      var quality_match = page.match(/<li><b>Качество:<\/b>([^<,]+)<\/li>/i);
      var translation_match = page.match(/<li><b>Перевод:<\/b>([^<,]+)<\/li>/i);
      quality_type = quality_match ? quality_match[1].trim() : '';
      translation = translation_match ? translation_match[1].trim() : '';
      var vod = str.split('|');

      if (vod[0] == 'file') {
        var file = vod[1];
        var found = [];
        var subtiles = parseSubs(vod[2]);

        if (file) {
          var voices = {};
          component.parsePlaylist(file).forEach(function (item) {
            var prev = voices[item.voice || ''];
            var quality_str = item.label.match(/(\d\d\d+)p/);
            var quality = quality_str ? parseInt(quality_str[1]) : NaN;

            if (!prev || quality > prev.quality) {
              voices[item.voice || ''] = {
                quality: quality
              };
            }
          });

          for (var voice in voices) {
            var el = voices[voice];
            found.push({
              file: file,
              title: voice || translation || object.movie.title,
              quality: el.quality + 'p' + (quality_type ? ' - ' + quality_type : ''),
              info: '',
              voice: voice,
              subtitles: subtiles
            });
          }
        }

        extract = found;
        is_playlist = false;
      } else if (vod[0] == 'pl') {
        extract = Lampa.Arrays.decodeJson(vod[1], []);
        is_playlist = true;
      } else component.emptyForQuery(select_title);
    }

    function getPage(url) {
      network.clear();
      network.timeout(1000 * 10);
      network["native"](embed + url, function (str) {
        str = str.replace(/\n/g, '');
        var MOVIE_ID = str.match('var MOVIE_ID = ([^;]+);');
        var IDENTIFIER = str.match('var IDENTIFIER = "([^"]+)"');
        var PLAYER_CUID = str.match('var PLAYER_CUID = "([^"]+)"');

        if (MOVIE_ID && IDENTIFIER && PLAYER_CUID) {
          select_id = MOVIE_ID[1];
          var identifier = IDENTIFIER[1];
          var player_cuid = PLAYER_CUID[1];
          var data_url = "user_data";
          data_url = Lampa.Utils.addUrlComponent(data_url, "page=movie");
          data_url = Lampa.Utils.addUrlComponent(data_url, "movie_id=" + select_id);
          data_url = Lampa.Utils.addUrlComponent(data_url, "cuid=" + player_cuid);
          data_url = Lampa.Utils.addUrlComponent(data_url, "device=DESKTOP");
          data_url = Lampa.Utils.addUrlComponent(data_url, "_=" + Date.now());
          network.clear();
          network.timeout(1000 * 10);
          network["native"](embed + data_url, function (user_data) {
            if (user_data.vod_hash && user_data.vod_time) {
              var file_url = "vod/" + select_id;
              file_url = Lampa.Utils.addUrlComponent(file_url, "identifier=" + identifier);
              file_url = Lampa.Utils.addUrlComponent(file_url, "player_type=new");
              file_url = Lampa.Utils.addUrlComponent(file_url, "file_type=" + (prefer_mp4 ? "mp4" : "hls"));
              file_url = Lampa.Utils.addUrlComponent(file_url, "st=" + user_data.vod_hash);
              file_url = Lampa.Utils.addUrlComponent(file_url, "e=" + user_data.vod_time);
              file_url = Lampa.Utils.addUrlComponent(file_url, "_=" + Date.now());
              network.clear();
              network.timeout(1000 * 10);
              network["native"](embed + file_url, function (files) {
                component.loading(false);
                extractData(files, str);
                filter();
                append(filtred());
              }, function (a, c) {
                component.empty(network.errorDecode(a, c));
              }, false, {
                dataType: 'text'
              });
            } else component.empty(Lampa.Lang.translate('torrent_parser_no_hash'));
          }, function (a, c) {
            component.empty(network.errorDecode(a, c));
          });
        } else component.emptyForQuery(select_title);
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      }, false, {
        dataType: 'text'
      });
    }
    /**
     * Получить потоки
     * @param {String} str
     * @param {String} voice
     * @returns array
     */


    function extractItems(str, voice) {
      try {
        var list = component.parsePlaylist(str);

        if (voice) {
          var tmp = list.filter(function (el) {
            return el.voice == voice;
          });

          if (tmp.length) {
            list = tmp;
          } else {
            list = list.filter(function (el) {
              return typeof el.voice === 'undefined';
            });
          }
        }

        var items = list.map(function (item) {
          var quality = item.label.match(/(\d\d\d+)p/);
          return {
            label: item.label,
            voice: item.voice,
            quality: quality ? parseInt(quality[1]) : NaN,
            file: item.links[0]
          };
        });
        items.sort(function (a, b) {
          if (b.quality > a.quality) return 1;
          if (b.quality < a.quality) return -1;
          if (b.label > a.label) return 1;
          if (b.label < a.label) return -1;
          return 0;
        });
        return items;
      } catch (e) {}

      return [];
    }

    function getStream(element) {
      var file = '',
          quality = false;
      var items = extractItems(element.file, element.voice);

      if (items && items.length) {
        file = items[0].file;
        quality = {};
        items.forEach(function (item) {
          quality[item.label] = item.file;
        });
        var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
        if (quality[preferably]) file = quality[preferably];
      }

      element.stream = file;
      element.qualitys = quality;
      return {
        file: file,
        quality: quality
      };
    }
    /**
     * Показать файлы
     */


    function append(items) {
      component.reset();
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      items.forEach(function (element, index) {
        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, element.title, 'kinobase'].join('') : object.movie.original_title + element.quality + 'kinobase');
        element.timeline = view;
        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          getStream(element);

          if (element.stream) {
            var playlist = [];
            var first = {
              url: element.stream,
              quality: element.qualitys,
              subtitles: element.subtitles,
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + (element.title == object.movie.title ? '' : ' / ' + element.title)
            };

            if (element.season) {
              items.forEach(function (elem) {
                getStream(elem);
                playlist.push({
                  url: elem.stream,
                  quality: elem.qualitys,
                  subtitles: elem.subtitles,
                  timeline: elem.timeline,
                  title: elem.title
                });
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          } else Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          file: function file(call) {
            call(getStream(element));
          }
        });
      });
      component.start(true);
    }
  }

  function collaps(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var embed = component.proxy('collaps') + 'https://api.loadbox.ws/embed/';
    var object = _object;
    var select_title = '';
    var prefer_dash = Lampa.Storage.field('online_mod_prefer_dash') === true;
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0
    };
    /**
     * Поиск
     * @param {Object} _object 
     */

    this.search = function (_object, kinopoisk_id) {
      object = _object;
      select_title = object.movie.title;
      var url = embed + 'kp/' + kinopoisk_id;
      network.clear();
      network.timeout(10000);
      network.silent(url, function (str) {
        if (str) {
          parse(str);
        } else component.emptyForQuery(select_title);

        component.loading(false);
      }, function (a, c) {
        if (a.status == 404 && a.responseText && a.responseText.indexOf('видео недоступно') !== -1) component.emptyForQuery(select_title);else component.empty(network.errorDecode(a, c));
      }, false, {
        dataType: 'text'
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0
      };
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type 
     * @param {*} a 
     * @param {*} b 
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      component.reset();
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
      extract = null;
    };

    function parse(str) {
      str = str.replace(/\n/g, '');
      var find = str.match('makePlayer\\({(.*?)}\\);');
      var json;

      try {
        json = find && eval('({' + find[1] + '})');
      } catch (e) {}

      if (json) {
        extract = json;

        if (extract.playlist && extract.playlist.seasons) {
          extract.playlist.seasons.sort(function (a, b) {
            return a.season - b.season;
          });
        }

        filter();
        append(filtred());
      } else component.emptyForQuery(select_title);
    }
    /**
     * Построить фильтр
     */


    function filter() {
      filter_items = {
        season: [],
        voice: [],
        quality: []
      };

      if (extract.playlist && extract.playlist.seasons) {
        extract.playlist.seasons.forEach(function (season) {
          filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + season.season);
        });
      }

      if (!filter_items.season[choice.season]) choice.season = 0;
      component.filter(filter_items, choice);
    }
    /**
     * Отфильтровать файлы
     * @returns array
     */


    function filtred() {
      var filtred = [];

      if (extract.playlist) {
        extract.playlist.seasons.forEach(function (season, i) {
          if (i == choice.season) {
            season.episodes.forEach(function (episode) {
              var audio_tracks = episode.audio.names.map(function (name) {
                return {
                  language: name
                };
              });
              filtred.push({
                file: prefer_dash && episode.dash || episode.hls,
                episode: parseInt(episode.episode),
                season: season.season,
                title: episode.title,
                quality: '',
                info: episode.audio.names.slice(0, 5).join(', '),
                subtitles: episode.cc ? episode.cc.map(function (c) {
                  return {
                    label: c.name,
                    url: c.url
                  };
                }) : false,
                audio_tracks: audio_tracks.length ? audio_tracks : false
              });
            });
          }
        });
      } else if (extract.source) {
        var resolution = Lampa.Arrays.getKeys(extract.qualityByWidth).pop();
        var max_quality = extract.qualityByWidth ? extract.qualityByWidth[resolution] || 0 : 0;
        var audio_tracks = extract.source.audio.names.map(function (name) {
          return {
            language: name
          };
        });
        filtred.push({
          file: prefer_dash && extract.source.dash || extract.source.hls,
          title: extract.title,
          quality: max_quality ? max_quality + 'p / ' : '',
          info: extract.source.audio.names.slice(0, 5).join(', '),
          subtitles: extract.source.cc ? extract.source.cc.map(function (c) {
            return {
              label: c.name,
              url: c.url
            };
          }) : false,
          audio_tracks: audio_tracks.length ? audio_tracks : false
        });
      }

      return filtred;
    }
    /**
     * Показать файлы
     */


    function append(items) {
      component.reset();
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      items.forEach(function (element) {
        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, element.title].join('') : object.movie.original_title + 'collaps');
        element.timeline = view;
        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);

          if (element.file) {
            var playlist = [];
            var first = {
              url: element.file,
              subtitles: element.subtitles,
              translate: {
                tracks: element.audio_tracks
              },
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + (element.title == object.movie.title ? '' : ' / ' + element.title)
            };

            if (element.season) {
              items.forEach(function (elem) {
                playlist.push({
                  url: elem.file,
                  subtitles: elem.subtitles,
                  translate: {
                    tracks: elem.audio_tracks
                  },
                  timeline: elem.timeline,
                  title: elem.title
                });
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          } else Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          file: function file(call) {
            call({
              file: element.file
            });
          }
        });
      });
      component.start(true);
    }
  }

  function cdnmovies(component, _object) {
    var network = new Lampa.Reguest();
    var extract = [];
    var object = _object;
    var select_title = '';
    var prefer_mp4 = Lampa.Storage.field('online_mod_prefer_mp4') === true;
    var embed = component.proxy('cdnmovies') + 'https://cdnmovies.net/api/short';
    var token = '02d56099082ad5ad586d7fe4e2493dd9';
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: ''
    };
    /**
     * Начать поиск
     * @param {Object} _object 
     * @param {String} kinopoisk_id
     */

    this.search = function (_object, kinopoisk_id, data) {
      var _this = this;

      if (this.wait_similars && data && data[0].is_similars) return this.find(data[0].iframe_src);
      object = _object;
      select_title = object.search || object.movie.title;
      var search_date = object.search_date || object.movie.release_date || object.movie.first_air_date || object.movie.last_air_date || '0000';
      var search_year = parseInt((search_date + '').slice(0, 4));
      var orig = object.movie.original_title || object.movie.original_name;

      var display = function display(data) {
        if (data && Object.keys(data).length) {
          var items = [];

          for (var id in data) {
            items.push(data[id]);
          }

          var is_sure = false;

          if (object.movie.imdb_id) {
            var tmp = items.filter(function (elem) {
              return elem.imdb_id == object.movie.imdb_id;
            });

            if (tmp.length) {
              items = tmp;
              is_sure = true;
            }
          }

          var cards = items.filter(function (c) {
            var year = c.start_date || c.year || '0000';
            c.tmp_year = parseInt((year + '').slice(0, 4));
            return !c.tmp_year || !search_year || c.tmp_year > search_year - 2 && c.tmp_year < search_year + 2;
          });

          if (orig) {
            var _tmp = cards.filter(function (elem) {
              return component.equalTitle(elem.orig_title || elem.en_title || elem.ru_title, orig);
            });

            if (_tmp.length) {
              cards = _tmp;
              is_sure = true;
            }
          }

          if (select_title) {
            var _tmp2 = cards.filter(function (elem) {
              return component.equalTitle(elem.title || elem.ru_title || elem.en_title || elem.orig_title, select_title);
            });

            if (_tmp2.length) {
              cards = _tmp2;
              is_sure = true;
            }
          }

          if (cards.length > 1 && search_year) {
            var _tmp3 = cards.filter(function (c) {
              return c.tmp_year == search_year;
            });

            if (_tmp3.length) cards = _tmp3;
          }

          if (cards.length == 1 && is_sure) {
            _this.find(cards[0].iframe_src);
          } else {
            _this.wait_similars = true;
            items.forEach(function (c) {
              c.is_similars = true;
              c.seasons_count = c.last_season;
              c.episodes_count = c.last_episode;
            });
            component.similars(items);
            component.loading(false);
          }
        } else component.emptyForQuery(select_title);
      };

      var url = embed;
      url = Lampa.Utils.addUrlComponent(url, 'token=' + token);
      var url_by_title = Lampa.Utils.addUrlComponent(url, 'search=' + encodeURIComponent(select_title));
      if (object.movie.imdb_id) url = Lampa.Utils.addUrlComponent(url, 'imdb_id=' + encodeURIComponent(object.movie.imdb_id));else url = url_by_title;
      network.clear();
      network.timeout(10000);
      network["native"](url, function (json) {
        if (json.data && Object.keys(json.data).length) display(json.data);else if (object.movie.imdb_id) {
          network.clear();
          network.timeout(10000);
          network["native"](url_by_title, function (json) {
            if (json.data && Object.keys(json.data).length) display(json.data);else display({});
          }, function (a, c) {
            component.empty(network.errorDecode(a, c));
          });
        } else display({});
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      });
    };

    this.find = function (url) {
      network.clear();
      network.timeout(10000);
      network["native"]('https:' + url, function (json) {
        parse(json);
        component.loading(false);
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      }, false, {
        dataType: 'text'
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: ''
      };
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type 
     * @param {*} a 
     * @param {*} b 
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      if (a.stype == 'voice') choice.voice_name = filter_items.voice[b.index];
      component.reset();
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
    };

    function parse(str) {
      str = str.replace(/\n/g, '');
      var find = str.match("Playerjs\\({.*?\\bfile:'(.*?)'}\\);");
      var video = find && decode(find[1]);
      var json;

      try {
        json = video && JSON.parse(video);
      } catch (e) {}

      if (json) {
        extract = json;
        filter();
        append(filtred());
      } else component.emptyForQuery(select_title);
    }

    function decode(data) {
      if (data.charAt(0) !== '#') return data;

      var enc = function enc(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
          return String.fromCharCode('0x' + p1);
        }));
      };

      var dec = function dec(str) {
        return decodeURIComponent(atob(str).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
      };

      var trashList = ['-*frofpscprpamfpQ*45612.3256dfrgd', '54vjfhcgdbrydkcfkndz568436fred+*d', 'lvfycgndqcydrcgcfg+95147gfdgf-zd*', 'az+-erw*3457edgtjd-feqsptf/re*q*Y', 'df8vg69r9zxWdlyf+*fgx455g8fh9z-e*Q'];
      var x = data.substring(2);
      trashList.forEach(function (trash) {
        x = x.replace('//' + enc(trash), '');
      });

      try {
        x = dec(x);
      } catch (e) {
        x = '';
      }

      return x;
    }
    /**
     * Получить потоки
     * @param {String} str 
     * @returns array
     */


    function extractItems(str, url) {
      try {
        var base_url = url.substring(0, url.lastIndexOf('/'));
        var items = component.parseM3U(str).map(function (item) {
          var link = item.link;
          if (prefer_mp4) link = link.replace(/(\.mp4):hls:manifest\.m3u8$/i, '$1');
          var quality = item.height;
          var alt_quality = link.match(/\b(\d\d\d+)\b/);

          if (alt_quality) {
            var alt_height = parseInt(alt_quality[1]);
            if (alt_height > quality && alt_height <= 4320) quality = alt_height;
          }

          return {
            label: quality ? quality + 'p' : '360p ~ 1080p',
            quality: quality,
            file: link.indexOf('://') == -1 ? base_url + '/' + link : link
          };
        });
        items.sort(function (a, b) {
          if (b.quality > a.quality) return 1;
          if (b.quality < a.quality) return -1;
          if (b.label > a.label) return 1;
          if (b.label < a.label) return -1;
          return 0;
        });
        return items;
      } catch (e) {}

      return [];
    }
    /**
     * Получить поток
     * @param {*} element 
     */


    function getStream(element, call, error) {
      if (element.stream) return call(element);
      var url = element.file;
      network.clear();
      network.timeout(5000);
      network["native"](url, function (str) {
        var file = '';
        var quality = false;
        var items = extractItems(str, url);

        if (items && items.length) {
          file = items[0].file;
          quality = {};
          items.forEach(function (item) {
            quality[item.label] = item.file;
          });
          var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
          if (quality[preferably]) file = quality[preferably];
        }

        if (file) {
          element.stream = file;
          element.qualitys = quality;
          call(element);
        } else error();
      }, error, false, {
        dataType: 'text'
      });
    }
    /**
     * Построить фильтр
     */


    function filter() {
      filter_items = {
        season: [],
        voice: [],
        quality: []
      };
      extract.forEach(function (season) {
        if (season.folder) filter_items.season.push(season.title);
      });
      if (!filter_items.season[choice.season]) choice.season = 0;

      if (extract[choice.season] && extract[choice.season].folder) {
        extract[choice.season].folder.forEach(function (f) {
          f.folder.forEach(function (t) {
            if (filter_items.voice.indexOf(t.title) == -1) filter_items.voice.push(t.title);
          });
        });
      }

      if (!filter_items.voice[choice.voice]) choice.voice = 0;

      if (choice.voice_name) {
        var inx = filter_items.voice.indexOf(choice.voice_name);
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }

    function parseSubs(str) {
      var subtitles = component.parsePlaylist(str).map(function (item) {
        return {
          label: item.label,
          url: item.links[0]
        };
      });
      return subtitles.length ? subtitles : false;
    }
    /**
     * Отфильтровать файлы
     * @returns array
     */


    function filtred() {
      var filtred = [];
      extract.forEach(function (data) {
        if (data.folder) {
          if (data.title == filter_items.season[choice.season]) {
            data.folder.forEach(function (se) {
              se.folder.forEach(function (eps) {
                if (eps.title == filter_items.voice[choice.voice]) {
                  var episode_num = parseInt(se.title.match(/\d+/));
                  var season_num = parseInt(data.title.match(/\d+/));
                  filtred.push({
                    file: eps.file,
                    episode: episode_num,
                    season: season_num,
                    title: 'S' + season_num + ' / ' + Lampa.Lang.translate('torrent_serial_episode') + ' ' + episode_num,
                    quality: '360p ~ 1080p',
                    info: ' / ' + Lampa.Utils.shortText(eps.title, 50)
                  });
                }
              });
            });
          }
        } else {
          filtred.push({
            file: data.file,
            title: data.title,
            quality: '360p ~ 1080p',
            info: '',
            subtitles: data.subtitle ? parseSubs(data.subtitle) : false
          });
        }
      });
      return filtred;
    }
    /**
     * Добавить видео
     * @param {Array} items 
     */


    function append(items) {
      component.reset();
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      items.forEach(function (element) {
        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
        item.addClass('video--stream');
        element.timeline = view;
        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          getStream(element, function (element) {
            var first = {
              url: element.stream,
              quality: element.qualitys,
              subtitles: element.subtitles,
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + ' / ' + element.title
            };
            Lampa.Player.play(first);

            if (element.season && Lampa.Platform.version) {
              var playlist = [];
              items.forEach(function (elem) {
                if (elem == element) {
                  playlist.push(first);
                } else {
                  var cell = {
                    url: function url(call) {
                      getStream(elem, function (elem) {
                        cell.url = elem.stream;
                        cell.quality = elem.qualitys;
                        cell.subtitles = elem.subtitles;
                        call();
                      }, function () {
                        cell.url = '';
                        call();
                      });
                    },
                    timeline: elem.timeline,
                    title: elem.title
                  };
                  playlist.push(cell);
                }
              });
              Lampa.Player.playlist(playlist);
            } else {
              Lampa.Player.playlist([first]);
            }

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          }, function () {
            Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
          });
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          file: function file(call) {
            getStream(element, function (element) {
              call({
                file: element.stream,
                quality: element.qualitys
              });
            }, function () {
              Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
            });
          }
        });
      });
      component.start(true);
    }
  }

  function filmix(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var results = {};
    var object = _object;
    var embed = 'http://filmixapp.cyou/api/v2/';
    var select_title = '';
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: ''
    };
    var token = Lampa.Storage.get('filmix_token', '');

    if (!window.filmix) {
      window.filmix = {
        max_qualitie: 720,
        is_max_qualitie: false
      };
    }

    var dev_token = '?user_dev_apk=2.0.1&user_dev_id=1d07ba88e4b45d30&user_dev_name=Xiaomi&user_dev_os=12&user_dev_token=' + (token || 'aaaabbbbccccddddeeeeffffaaaabbbb') + '&user_dev_vendor=Xiaomi';
    /**
     * Начать поиск
     * @param {Object} _object 
     * @param {String} kinopoisk_id
     */

    this.search = function (_object, kinopoisk_id, data) {
      var _this = this;

      if (this.wait_similars && data && data[0].is_similars) return this.find(data[0].id);
      object = _object;
      select_title = object.search || object.movie.title;
      var search_date = object.search_date || object.movie.release_date || object.movie.first_air_date || object.movie.last_air_date || '0000';
      var search_year = parseInt((search_date + '').slice(0, 4));
      var orig = object.movie.original_title || object.movie.original_name;
      var clean_title = component.cleanTitle(select_title).replace(/\b(\d\d\d\d+)\b/g, '+$1');

      if (search_year) {
        clean_title = clean_title.replace(new RegExp(' \\+(' + search_year + ')$'), ' $1');
      }

      var url = embed + 'search' + dev_token;
      url = Lampa.Utils.addUrlComponent(url, 'story=' + encodeURIComponent(clean_title));
      network.clear();
      network.timeout(10000);
      network.silent(url, function (json) {
        var is_sure = false;
        var cards = json.filter(function (c) {
          if (!c.year && c.alt_name) c.year = parseInt(c.alt_name.split('-').pop());
          return !c.year || !search_year || c.year > search_year - 2 && c.year < search_year + 2;
        });

        if (orig) {
          var tmp = cards.filter(function (c) {
            return component.equalTitle(c.original_title, orig);
          });

          if (tmp.length) {
            cards = tmp;
            is_sure = true;
          }
        }

        if (select_title) {
          var _tmp = cards.filter(function (c) {
            return component.equalTitle(c.title, select_title);
          });

          if (_tmp.length) {
            cards = _tmp;
            is_sure = true;
          }
        }

        if (cards.length > 1 && search_year) {
          var _tmp2 = cards.filter(function (c) {
            return c.year == search_year;
          });

          if (_tmp2.length) cards = _tmp2;
        }

        if (cards.length == 1 && is_sure) _this.find(cards[0].id);else if (json.length) {
          _this.wait_similars = true;
          json.forEach(function (c) {
            c.is_similars = true;
            c.seasons_count = c.last_episode && c.last_episode.season;
            c.episodes_count = c.last_episode && c.last_episode.episode;
          });
          component.similars(json);
          component.loading(false);
        } else component.emptyForQuery(select_title);
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      });
    };

    this.find = function (filmix_id) {
      var url = embed;

      if (!window.filmix.is_max_qualitie && token) {
        window.filmix.is_max_qualitie = true;
        network.clear();
        network.timeout(10000);
        network.silent(url + 'user_profile' + dev_token, function (found) {
          if (found && found.user_data) {
            if (found.user_data.is_pro) window.filmix.max_qualitie = 1080;
            if (found.user_data.is_pro_plus) window.filmix.max_qualitie = 2160;
          }

          end_search(filmix_id);
        });
      } else end_search(filmix_id);

      function end_search(filmix_id) {
        network.clear();
        network.timeout(10000);
        network.silent(url + 'post/' + filmix_id + dev_token, function (found) {
          if (found && Object.keys(found).length) {
            success(found);
            component.loading(false);
          } else component.emptyForQuery(select_title);
        }, function (a, c) {
          component.empty(network.errorDecode(a, c));
        });
      }
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: ''
      };
      extractData(results);
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type 
     * @param {*} a 
     * @param {*} b 
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      if (a.stype == 'voice') choice.voice_name = filter_items.voice[b.index];
      component.reset();
      extractData(results);
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
      results = null;
    };
    /**
     * Успешно, есть данные
     * @param {Object} json
     */


    function success(json) {
      results = json;
      extractData(json);
      filter();
      append(filtred());
    }
    /**
     * Получить информацию о фильме
     * @param {Arrays} data
     */


    function extractData(data) {
      extract = {};
      var pl_links = data.player_links || {};

      if (pl_links.playlist && Object.keys(pl_links.playlist).length > 0) {
        var seas_num = 0;

        for (var season in pl_links.playlist) {
          var episode = pl_links.playlist[season];
          ++seas_num;
          var transl_id = 0;

          for (var voice in episode) {
            var episode_voice = episode[voice];
            ++transl_id;
            var items = [],
                epis_num = 0;

            for (var ID in episode_voice) {
              var file_episod = episode_voice[ID];
              ++epis_num;
              var quality_eps = file_episod.qualities.filter(function (qualitys) {
                return !isNaN(qualitys) && qualitys <= window.filmix.max_qualitie;
              });
              quality_eps.sort(function (a, b) {
                return b - a;
              });
              var max_quality = quality_eps[0];

              if (max_quality) {
                var stream_url = file_episod.link;
                var seas_id = parseInt(season);
                var epis_id = parseInt(ID);

                if (isNaN(seas_id) || isNaN(epis_id)) {
                  var s_e = stream_url.substring(stream_url.lastIndexOf('/'));
                  var str_s_e = s_e.match(/s(\d+)e(\d+)_%s\.mp4/i);

                  if (str_s_e) {
                    seas_id = parseInt(str_s_e[1]);
                    epis_id = parseInt(str_s_e[2]);
                  }
                }

                if (isNaN(seas_id)) seas_id = seas_num;
                if (isNaN(epis_id)) epis_id = epis_num;
                items.push({
                  id: seas_id + '_' + epis_id,
                  file: stream_url,
                  episode: epis_id,
                  season: seas_id,
                  quality: max_quality,
                  qualities: quality_eps,
                  translation: transl_id
                });
              }
            }

            if (!extract[transl_id]) extract[transl_id] = {
              json: [],
              file: ''
            };
            extract[transl_id].json.push({
              id: seas_num,
              folder: items,
              translation: transl_id
            });
          }
        }
      } else if (pl_links.movie && pl_links.movie.length > 0) {
        var _transl_id = 0;

        for (var _ID in pl_links.movie) {
          var _file_episod = pl_links.movie[_ID];
          ++_transl_id;
          var _max_quality = window.filmix.max_qualitie;

          var _quality_eps = _file_episod.link.match(/\[([\d,]*)\]\.mp4/i);

          if (_quality_eps) {
            _quality_eps = _quality_eps[1].split(',').map(function (quality) {
              return parseInt(quality);
            }).filter(function (quality) {
              return !isNaN(quality) && quality <= window.filmix.max_qualitie;
            });

            _quality_eps.sort(function (a, b) {
              return b - a;
            });

            _max_quality = _quality_eps[0];
          }

          if (_max_quality) {
            var file_url = _file_episod.link.replace(/\[[\d,]*\](\.mp4)/i, '%s$1');

            extract[_transl_id] = {
              file: file_url,
              translation: _file_episod.translation,
              quality: _max_quality,
              qualities: _quality_eps
            };
          }
        }
      }
    }
    /**
     * Найти поток
     * @param {Object} element
     * @param {Int} max_quality
     * @returns string
     */


    function getFile(element, max_quality) {
      var translat = extract[element.translation];
      var id = element.season + '_' + element.episode;
      var file = '';
      var eps = {};
      var quality = false;

      if (translat) {
        if (element.season) for (var i in translat.json) {
          var elem = translat.json[i];
          if (elem.folder) for (var f in elem.folder) {
            var folder = elem.folder[f];

            if (folder.id == id) {
              eps = folder;
              break;
            }
          } else {
            if (elem.id == id) {
              eps = elem;
              break;
            }
          }
        } else eps = translat;
      }

      file = eps.file;

      if (file) {
        quality = {};

        if (eps.qualities) {
          eps.qualities.forEach(function (q) {
            quality[q + 'p'] = file.replace(/%s(\.mp4)/i, q + '$1');
          });
          file = file.replace(/%s(\.mp4)/i, eps.qualities[0] + '$1');
        }

        var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
        if (quality[preferably]) file = quality[preferably];
      }

      return {
        file: file,
        quality: quality
      };
    }
    /**
     * Построить фильтр
     */


    function filter() {
      filter_items = {
        season: [],
        voice: [],
        voice_info: []
      };

      if (results.last_episode && results.last_episode.season) {
        var s = results.last_episode.season;

        while (s--) {
          filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + (results.last_episode.season - s));
        }
      }

      if (!filter_items.season[choice.season]) choice.season = 0;
      var seas_num = 0;
      var pl_links = results.player_links || {};

      for (var Id in pl_links.playlist) {
        var season = pl_links.playlist[Id];
        ++seas_num;

        if (seas_num == choice.season + 1) {
          var d = 0;

          for (var voic in season) {
            ++d;

            if (filter_items.voice.indexOf(voic) == -1) {
              filter_items.voice.push(voic);
              filter_items.voice_info.push({
                id: d
              });
            }
          }
        }
      }

      if (!filter_items.voice[choice.voice]) choice.voice = 0;

      if (choice.voice_name) {
        var inx = filter_items.voice.indexOf(choice.voice_name);
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }
    /**
     * Отфильтровать файлы
     * @returns array
     */


    function filtred() {
      var filtred = [];
      var pl_links = results.player_links || {};

      if (pl_links.playlist && Object.keys(pl_links.playlist).length) {
        for (var transl in extract) {
          var element = extract[transl];

          for (var season_id in element.json) {
            var episode = element.json[season_id];

            if (episode.id == choice.season + 1) {
              episode.folder.forEach(function (media) {
                if (filter_items.voice_info[choice.voice] && media.translation == filter_items.voice_info[choice.voice].id) {
                  filtred.push({
                    episode: media.episode,
                    season: media.season,
                    title: 'S' + media.season + ' / ' + Lampa.Lang.translate('torrent_serial_episode') + ' ' + media.episode,
                    quality: media.quality + 'p',
                    info: ' / ' + Lampa.Utils.shortText(filter_items.voice[choice.voice], 50),
                    translation: media.translation
                  });
                }
              });
            }
          }
        }
      } else if (pl_links.movie && Object.keys(pl_links.movie).length) {
        for (var transl_id in extract) {
          var _element = extract[transl_id];
          filtred.push({
            title: _element.translation,
            quality: _element.quality + 'p',
            info: '',
            qualitys: _element.qualities,
            translation: transl_id
          });
        }
      }

      return filtred;
    }
    /**
     * Добавить видео
     * @param {Array} items 
     */


    function append(items) {
      component.reset();
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      var last_episode = component.getLastEpisode(items);
      items.forEach(function (element) {
        if (element.season) {
          element.translate_episode_end = last_episode;
          element.translate_voice = filter_items.voice[choice.voice];
        }

        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
        item.addClass('video--stream');
        element.timeline = view;
        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          var extra = getFile(element, element.quality);

          if (extra.file) {
            var playlist = [];
            var first = {
              url: extra.file,
              quality: extra.quality,
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + ' / ' + element.title
            };

            if (element.season) {
              items.forEach(function (elem) {
                var ex = getFile(elem, elem.quality);
                playlist.push({
                  url: ex.file,
                  quality: ex.quality,
                  timeline: elem.timeline,
                  title: elem.title
                });
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          } else Lampa.Noty.show(Lampa.Lang.translate('online_mod_nolink'));
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          element: element,
          file: function file(call) {
            call(getFile(element, element.quality));
          }
        });
      });
      component.start(true);
    }
  }

  function hdvb(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var results = [];
    var object = _object;
    var select_title = '';
    var select_id = '';
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      quality: 0
    };
    var translator = {};
    /**
     * Поиск
     * @param {Object} _object
     */

    this.search = function (_object, kinopoisk_id) {
      object = _object;
      select_id = kinopoisk_id;
      select_title = object.movie.title;

      if (isNaN(kinopoisk_id)) {
        component.empty("kinopoisk_id is null");
        return;
      }

      var url = 'https://apivb.info/api/videos.json?token=5e2fe4c70bafd9a7414c4f170ee1b192&id_kp=' + kinopoisk_id;
      network.clear();
      network.timeout(10000);
      network.silent(url, function (found) {
        results = [];

        if (!found) {
          component.emptyForQuery(select_title);
        } else if (found.error || found.text) {
          component.empty(found.error || found.text);
        } else {
          (typeof found === "string" ? Lampa.Arrays.decodeJson(found, []) : found).forEach(function (result, keyt) {
            result.link = result.iframe_url;
            result.serial = result.type == 'serial' ? 1 : 0;
            result.translation_id = keyt;
            result.translation = result.translator;

            if (result.serial == 1) {
              result.seasons = [];
              result.serial_episodes.forEach(function (season, keys) {
                result.last_season = season.season_number;
                result.seasons[season.season_number] = [];

                if (season.episodes) {
                  season.episodes.forEach(function (episode, keye) {
                    result.seasons[season.season_number][episode] = {
                      link: result.link
                    };
                  });
                }
              });
            } else {
              result.movie = {
                link: result.link
              };
            }

            translator[result.translation] = result.translation_id;
            results[result.translation_id] = Object.assign({}, result);
          });
          success(results);
          component.loading(false);
          if (!results.length) component.emptyForQuery(select_title);
        }
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: ''
      };
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type
     * @param {*} a
     * @param {*} b
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      if (a.stype == 'voice') choice.voice_name = filter_items.voice[b.index];
      component.reset();
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
      results = null;
    };
    /**
     * Успешно, есть данные
     * @param {Object} json
     */


    function success(json) {
      results = json;
      extractData(json);
      filter();
      append(filtred());
    }
    /**
     * Получить потоки
     * @param {String} str
     * @param {Int} max_quality
     * @returns string
     */


    function extractData(json) {
      json.forEach(function (translation, keyt) {
        if (translation.serial == 1) {
          extract[keyt] = {
            seasons: [],
            file: translation.link,
            serial: translation.serial
          };

          for (var keys in translation.seasons) {
            var season = translation.seasons[keys];
            var episodes = [];

            for (var keye in season) {
              var episode = season[keye];
              episodes[keye] = {
                id: keys + '_' + keye,
                season: keys,
                episode: keye,
                media: episode,
                translation: keyt
              };
            }

            extract[keyt].seasons[keys] = episodes;
          }
        } else if (translation.serial == 0) {
          var movie = translation.movie;
          extract[keyt] = {
            media: movie,
            translation: translation.translation,
            serial: translation.serial
          };
        }
      });
    }
    /**
     * Найти поток
     * @param {Object} element
     * @returns string
     */


    function getFile(element) {
      var file = '';
      var quality = false;
      var items = element.media.items;

      if (items && items.length) {
        file = items[0].file;
        quality = {};
        items.forEach(function (item) {
          quality[item.label] = item.file;
        });
        var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
        if (quality[preferably]) file = quality[preferably];
      }

      return {
        file: file,
        quality: quality
      };
    }
    /**
     * Построить фильтр
     */


    function filter() {
      filter_items = {
        season: [],
        voice: [],
        voice_info: []
      };
      results.forEach(function (translation, keyt) {
        if (translation.serial == 1) {
          var s = translation.last_season;

          while (s--) {
            if (filter_items.season.indexOf(Lampa.Lang.translate('torrent_serial_season') + ' ' + (translation.last_season - s)) == -1) filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + (translation.last_season - s));
          }
        }
      });
      if (!filter_items.season[choice.season]) choice.season = 0;
      results.forEach(function (translation, keyt) {
        if (translation.serial == 1) {
          if (translation.seasons[choice.season + 1] && translation.seasons[choice.season + 1].length) {
            if (filter_items.voice.indexOf(translation.translation) == -1) {
              filter_items.voice.push(translation.translation);
              filter_items.voice_info.push({
                id: keyt
              });
            }
          }
        }
      });
      if (!filter_items.voice[choice.voice]) choice.voice = 0;

      if (choice.voice_name) {
        var inx = filter_items.voice.indexOf(choice.voice_name);
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }
    /**
     * Отфильтровать файлы
     * @returns array
     */


    function filtred() {
      var filtred = [];

      var _loop = function _loop(keyt) {
        var translation = extract[keyt];

        if (translation.serial == 1) {
          if (filter_items.voice_info[choice.voice] && keyt == filter_items.voice_info[choice.voice].id) {
            for (var keys in translation.seasons) {
              if (keys == choice.season + 1) {
                translation.seasons[keys].forEach(function (episode) {
                  filtred.push({
                    media: episode.media,
                    episode: episode.episode,
                    season: episode.season,
                    title: 'S' + episode.season + ' / ' + Lampa.Lang.translate('torrent_serial_episode') + ' ' + episode.episode,
                    quality: '360p ~ 1080p' + (results[keyt].quality ? ' - ' + results[keyt].quality : ''),
                    info: ' / ' + filter_items.voice[choice.voice],
                    translation: keyt
                  });
                });
              }
            }
          }
        } else {
          filtred.push({
            media: translation.media,
            title: Lampa.Utils.capitalizeFirstLetter(translation.translation),
            quality: '360p ~ 1080p' + (results[keyt].quality ? ' - ' + results[keyt].quality : ''),
            info: '',
            translation: keyt
          });
        }
      };

      for (var keyt in extract) {
        _loop(keyt);
      }

      return filtred;
    }

    function extractItems(str, url) {
      try {
        var base_url = url.substring(0, url.lastIndexOf('/'));
        var items = component.parseM3U(str).map(function (item) {
          var link = item.link;
          var quality = item.height;
          var alt_quality = link.match(/\b(\d\d\d+)\b/);

          if (alt_quality) {
            var alt_height = parseInt(alt_quality[1]);
            if (alt_height > quality && alt_height <= 4320) quality = alt_height;
          }

          return {
            label: quality ? quality + 'p' : '360p ~ 1080p',
            quality: quality,
            file: link.indexOf('://') == -1 ? base_url + '/' + link : link
          };
        });
        items.sort(function (a, b) {
          if (b.quality > a.quality) return 1;
          if (b.quality < a.quality) return -1;
          if (b.label > a.label) return 1;
          if (b.label < a.label) return -1;
          return 0;
        });
        return items;
      } catch (e) {}

      return [];
    }

    function getStreamQuality(element, call, error) {
      network.clear();
      network.timeout(10000);
      network.silent(element.media.link, function (plist) {
        element.media.items = extractItems(plist, element.media.link);
        return call(element);
      }, function (a, c) {
        error(network.errorDecode(a, c));
      }, false, {
        dataType: 'text'
      });
    }

    function getStream(element, call, error) {
      if (element.media.items) {
        return call(getFile(element));
      }

      var link = element.media.link;

      if (!link) {
        error();
        return;
      }

      if (link.substr(-5) === ".m3u8") {
        getStreamQuality(element, function (element) {
          return call(getFile(element));
        }, error);
        return;
      }

      var post_data = {
        serial: results[element.translation].serial,
        link: link,
        referer: link,
        translator: results[element.translation].translation,
        season: element.season,
        episode: element.episode
      };

      if (!link.startsWith('http')) {
        post_data.referer = results[element.translation].link;
        post_data.host = results[element.translation].host;
        post_data.key = results[element.translation].key;
      }

      var url = component.proxy('hdvb') + 'http://freebie.tom.ru/hdvburl?v=799&id_kp=' + select_id;
      if (element.translation) url = Lampa.Utils.addUrlComponent(url, 'translation=' + element.translation);
      if (element.season) url = Lampa.Utils.addUrlComponent(url, 'season=' + element.season);
      if (element.episode) url = Lampa.Utils.addUrlComponent(url, 'episode=' + element.episode);
      network.clear();
      network.timeout(15000);
      network.silent(url, function (str) {
        if (!str || str == 'VideoNotFound' || str == 'error' || str == '10' || str.indexOf('"error"') !== -1) {
          error(str);
          return;
        }

        var result = results[element.translation];

        if (result.serial == 1) {
          if (!link.startsWith('http')) {
            result.seasons[element.season][element.episode].link = str;
          } else {
            Lampa.Arrays.decodeJson(str, []).forEach(function (season) {
              result.host = season.host;
              result.key = season.key;
              season.folder.forEach(function (episode) {
                episode.folder.forEach(function (translation) {
                  var keyt = translator[translation.title];

                  if (typeof keyt !== 'undefined') {
                    results[keyt].seasons[season.id][episode.episode].link = translation.file;
                  }
                });
              });
            });
            results.forEach(function (translation) {
              translation.host = result.host;
              translation.key = result.key;
            });
          }
        } else {
          result.movie.link = str;
        }

        var new_link = element.media.link;

        if (!new_link || new_link.substr(-5) !== ".m3u8") {
          error();
          return;
        }

        getStreamQuality(element, function (element) {
          return call(getFile(element));
        }, error);
      }, function (a, c) {
        error(network.errorDecode(a, c));
      }, JSON.stringify(post_data), {
        dataType: 'text'
      });
    }
    /**
     * Добавить видео
     * @param {Array} items
     */


    function append(items) {
      component.reset();
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      var last_episode = component.getLastEpisode(items);
      items.forEach(function (element) {
        if (element.season) {
          element.translate_episode_end = last_episode;
          element.translate_voice = filter_items.voice[choice.voice];
        }

        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
        item.addClass('video--stream');
        element.timeline = view;
        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          if (element.loading) return;
          element.loading = true;
          getStream(element, function (extra) {
            element.loading = false;
            var first = {
              url: extra.file,
              quality: extra.quality,
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + ' / ' + element.title
            };
            Lampa.Player.play(first);

            if (element.season && Lampa.Platform.version) {
              var playlist = [];
              items.forEach(function (elem) {
                if (elem == element) {
                  playlist.push(first);
                } else {
                  var cell = {
                    url: function url(call) {
                      getStream(elem, function (ex) {
                        cell.url = ex.file;
                        cell.quality = ex.quality;
                        call();
                      }, function () {
                        cell.url = '';
                        call();
                      });
                    },
                    timeline: elem.timeline,
                    title: elem.title
                  };
                  playlist.push(cell);
                }
              });
              Lampa.Player.playlist(playlist);
            } else {
              Lampa.Player.playlist([first]);
            }

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          }, function (error) {
            element.loading = false;
            Lampa.Noty.show(error || Lampa.Lang.translate('online_mod_nolink'));
          });
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          file: function file(call) {
            getStream(element, function (extra) {
              call({
                file: extra.file,
                quality: extra.quality
              });
            }, function (error) {
              Lampa.Noty.show(error || Lampa.Lang.translate('online_mod_nolink'));
            });
          }
        });
      });
      component.start(true);
    }
  }

  function videoapi(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var results = [];
    var object = _object;
    var select_title = '';
    var get_links_wait = false;
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: '',
      voice_id: 0
    };
    /**
     * Начать поиск
     * @param {Object} _object 
     * @param {String} kinopoisk_id
     */

    this.search = function (_object, kinopoisk_id, data) {
      object = _object;
      var itm = data[0];
      select_title = itm.title || object.movie.title;
      var url = component.proxy('videoapi') + 'http://5100.svetacdn.in/api/';
      var type = itm.iframe_src.split('/').slice(-2)[0];
      if (type == 'movie') type = 'movies';
      if (type == 'anime') type = 'animes';
      url += type;
      url = Lampa.Utils.addUrlComponent(url, 'api_token=qR0taraBKvEZULgjoIRj69AJ7O6Pgl9O');
      url = Lampa.Utils.addUrlComponent(url, itm.imdb_id ? 'imdb_id=' + encodeURIComponent(itm.imdb_id) : 'title=' + encodeURIComponent(select_title));
      url = Lampa.Utils.addUrlComponent(url, 'field=' + encodeURIComponent('global'));
      network.clear();
      network.timeout(20000);
      network.silent(url, function (found) {
        results = found.data.filter(function (elem) {
          return elem.id == itm.id;
        });
        success(results);
        component.loading(false);
        if (!results.length) component.emptyForQuery(select_title);
      }, function (a, c) {
        component.empty(network.errorDecode(a, c));
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };
    /**
     * Сброс фильтра
     */


    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: '',
        voice_id: 0
      };
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Применить фильтр
     * @param {*} type 
     * @param {*} a 
     * @param {*} b 
     */


    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;

      if (a.stype == 'voice') {
        choice.voice_name = filter_items.voice[b.index];
        choice.voice_id = filter_items.voice_info[b.index] && filter_items.voice_info[b.index].id;
      }

      component.reset();
      filter();
      append(filtred());
      component.saveChoice(choice);
    };
    /**
     * Уничтожить
     */


    this.destroy = function () {
      network.clear();
      results = null;
    };
    /**
     * Успешно, есть данные
     * @param {Object} json 
     */


    function success(json) {
      results = json;
      extractData(json);
      filter();
      append(filtred());
    }
    /**
     * Получить потоки
     * @param {String} str 
     * @returns array
     */


    function extractItems(str) {
      try {
        var items = component.parsePlaylist(str).map(function (item) {
          var quality = item.label.match(/(\d\d\d+)p/);
          var file = item.links[0];
          if (file) file = 'http:' + file;
          return {
            label: item.label,
            quality: quality ? parseInt(quality[1]) : NaN,
            file: file || ''
          };
        });
        items.sort(function (a, b) {
          if (b.quality > a.quality) return 1;
          if (b.quality < a.quality) return -1;
          if (b.label > a.label) return 1;
          if (b.label < a.label) return -1;
          return 0;
        });
        return items;
      } catch (e) {}

      return [];
    }
    /**
     * Получить информацию о фильме
     * @param {Arrays} results 
     */


    function extractData(results) {
      var movie = results.slice(0, 1)[0];
      extract = {};

      if (movie) {
        get_links_wait = true;
        var src = movie.iframe_src;
        network.clear();
        network.timeout(20000);
        network.silent(src, function (raw) {
          get_links_wait = false;
          component.render().find('.broadcast__scan').remove();
          var math = raw.replace(/\n/g, '').match(/id="files" value="(.*?)"/);

          if (math) {
            var text = document.createElement("textarea");
            text.innerHTML = math[1];
            var json = Lampa.Arrays.decodeJson(text.value, {});

            for (var i in json) {
              if (0 === i - 0) {
                continue;
              }

              extract[i] = {
                json: _typeof(json[i]) === 'object' ? json[i] : Lampa.Arrays.decodeJson(json[i], {}),
                items: extractItems(json[i])
              };

              for (var a in extract[i].json) {
                var elem = extract[i].json[a];

                if (elem.folder) {
                  for (var f in elem.folder) {
                    var folder = elem.folder[f];
                    folder.items = extractItems(folder.file);
                  }
                } else elem.items = extractItems(elem.file);
              }
            }
          }
        }, function () {
          get_links_wait = false;
          component.render().find('.broadcast__scan').remove();
        }, false, {
          dataType: 'text'
        });
      }
    }
    /**
     * Найти поток
     * @param {Object} element 
     * @param {Int} max_quality
     * @returns string
     */


    function getFile(element, max_quality) {
      var translat = extract[element.translation];
      var id = element.season + '_' + element.episode;
      var file = '';
      var items = [];
      var quality = false;

      if (translat) {
        if (element.season) {
          for (var i in translat.json) {
            var elem = translat.json[i];

            if (elem.folder) {
              for (var f in elem.folder) {
                var folder = elem.folder[f];

                if (folder.id == id) {
                  items = folder.items;
                  break;
                }
              }
            } else if (elem.id == id) {
              items = elem.items;
              break;
            }
          }
        } else {
          items = translat.items;
        }
      }

      if (items && items.length) {
        max_quality = parseInt(max_quality);

        if (max_quality) {
          items = items.filter(function (item) {
            return item.quality <= max_quality;
          });
        }

        if (items.length) {
          file = items[0].file;
          quality = {};
          items.forEach(function (item) {
            quality[item.label] = item.file;
          });
          var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
          if (quality[preferably]) file = quality[preferably];
        }
      }

      return {
        file: file,
        quality: quality
      };
    }
    /**
     * Построить фильтр
     */


    function filter() {
      filter_items = {
        season: [],
        voice: [],
        voice_info: []
      };
      results.slice(0, 1).forEach(function (movie) {
        if (movie.season_count) {
          var s = movie.season_count;

          while (s--) {
            filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + (movie.season_count - s));
          }
        }

        if (!filter_items.season[choice.season]) choice.season = 0;

        if (movie.episodes) {
          movie.episodes.forEach(function (episode) {
            if (episode.season_num == choice.season + 1) {
              episode.media.forEach(function (media) {
                if (!filter_items.voice_info.find(function (v) {
                  return v.id == media.translation.id;
                })) {
                  filter_items.voice.push(media.translation.shorter_title);
                  filter_items.voice_info.push({
                    id: media.translation.id
                  });
                }
              });
            }
          });
        }
      });
      if (!filter_items.season[choice.season]) choice.season = 0;
      if (!filter_items.voice[choice.voice]) choice.voice = 0;

      if (choice.voice_name) {
        var inx = -1;

        if (choice.voice_id) {
          var voice = filter_items.voice_info.find(function (v) {
            return v.id == choice.voice_id;
          });
          if (voice) inx = filter_items.voice_info.indexOf(voice);
        }

        if (inx == -1) inx = filter_items.voice.indexOf(choice.voice_name);
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }

    function parseSubtitles(subs) {
      var subtitles = [];

      if (Lampa.Arrays.isArray(subs)) {
        subtitles = subs.map(function (item) {
          return {
            label: item.lang,
            url: 'http:' + item.url
          };
        });
      }

      return subtitles.length ? subtitles : false;
    }
    /**
     * Отфильтровать файлы
     * @returns array
     */


    function filtred() {
      var filtred = [];
      results.slice(0, 1).forEach(function (movie) {
        if (movie.episodes) {
          movie.episodes.forEach(function (episode) {
            if (episode.season_num == choice.season + 1) {
              var temp = episode.media.filter(function (m) {
                return filter_items.voice_info[choice.voice] && m.translation.id == filter_items.voice_info[choice.voice].id;
              });
              temp.sort(function (a, b) {
                return b.max_quality - a.max_quality;
              });
              temp.slice(0, 1).forEach(function (media) {
                filtred.push({
                  episode: parseInt(episode.num),
                  season: episode.season_num,
                  title: 'S' + episode.season_num + ' / ' + Lampa.Lang.translate('torrent_serial_episode') + ' ' + episode.num + ' - ' + (episode.ru_title || episode.orig_title),
                  quality: media.max_quality + 'p',
                  info: ' / ' + filter_items.voice[choice.voice],
                  max_quality: media.max_quality,
                  translation: media.translation_id,
                  subtitles: parseSubtitles(media.subtitles)
                });
              });
            }
          });
        } else if (movie.translations) {
          movie.translations.forEach(function (translation) {
            var element = {
              max_quality: 1080
            };

            if (movie.media && movie.media.length) {
              element = movie.media.filter(function (media) {
                return media.translation_id == translation.id;
              })[0];
              if (!element) element = movie.media[0];
            }

            filtred.push({
              title: translation.title,
              quality: element.max_quality + 'p' + (element.source_quality ? ' - ' + element.source_quality.toUpperCase() : ''),
              info: '',
              max_quality: element.max_quality,
              translation: translation.id,
              subtitles: parseSubtitles(element.subtitles)
            });
          });
        }
      });
      return filtred;
    }
    /**
     * Добавить видео
     * @param {Array} items 
     */


    function append(items) {
      component.reset();
      if (get_links_wait) component.append($('<div class="broadcast__scan"><div></div></div>'));
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      var last_episode = component.getLastEpisode(items);
      items.forEach(function (element) {
        if (element.season) {
          element.translate_episode_end = last_episode;
          element.translate_voice = filter_items.voice[choice.voice];
        }

        var hash = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
        var view = Lampa.Timeline.view(hash);
        var item = Lampa.Template.get('online_mod', element);
        var hash_file = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, filter_items.voice[choice.voice]].join('') : object.movie.original_title + element.title);
        item.addClass('video--stream');
        element.timeline = view;
        item.append(Lampa.Timeline.render(view));

        if (Lampa.Timeline.details) {
          item.find('.online__quality').append(Lampa.Timeline.details(view, ' / '));
        }

        if (viewed.indexOf(hash_file) !== -1) item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
        item.on('hover:enter', function () {
          if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
          var extra = getFile(element, element.max_quality);

          if (extra.file) {
            var playlist = [];
            var first = {
              url: extra.file,
              quality: extra.quality,
              subtitles: element.subtitles,
              timeline: element.timeline,
              title: element.season ? element.title : object.movie.title + ' / ' + element.title
            };

            if (element.season) {
              items.forEach(function (elem) {
                var ex = getFile(elem, elem.max_quality);
                playlist.push({
                  url: ex.file,
                  quality: ex.quality,
                  subtitles: elem.subtitles,
                  timeline: elem.timeline,
                  title: elem.title
                });
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);

            if (viewed.indexOf(hash_file) == -1) {
              viewed.push(hash_file);
              item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
              Lampa.Storage.set('online_view', viewed);
            }
          } else Lampa.Noty.show(Lampa.Lang.translate(get_links_wait ? 'online_mod_waitlink' : 'online_mod_nolink'));
        });
        component.append(item);
        component.contextmenu({
          item: item,
          view: view,
          viewed: viewed,
          hash_file: hash_file,
          element: element,
          file: function file(call) {
            call(getFile(element, element.max_quality));
          }
        });
      });
      component.start(true);
    }
  }

  function component(object) {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
    var files = new Lampa.Files(object);
    var filter = new Lampa.Filter(object);
    var balanser = Lampa.Storage.get('online_mod_balanser', 'filmix');
    var last_bls = Lampa.Storage.field('online_mod_save_last_balanser') === false ? {} : Lampa.Storage.cache('online_mod_last_balanser', 200, {});
    var contextmenu_all = [];

    if (last_bls[object.movie.id]) {
      balanser = last_bls[object.movie.id];
    }

    this.proxy = function (name) {
      var my_proxy = 'https://lampa-cors.herokuapp.com/';
      //var my_proxy = 'https://cors-fallback.herokuapp.com/';
      var alt_proxy = 'http://prox.lampa.stream/';
      var cub_proxy = 'http://proxy.silanavoza.xyz/cdn/';

      if (Lampa.Storage.field('online_mod_proxy_' + name) === true) {
        if (name === 'kp') return my_proxy;
        if (name === 'rezka') return alt_proxy;
        if (name === 'rezka2') return alt_proxy;
        if (name === 'hdvb') return my_proxy;

        if (Lampa.Storage.field('online_mod_proxy_other') === true) {
          return cub_proxy;
        } else {
          if (name === 'cdnmovies') return cub_proxy;
          return my_proxy;
        }
      }

      return '';
    };

    var sources = {
      videocdn: new videocdn(this, object),
      rezka: new rezka(this, object),
      rezka2: new rezka2(this, object),
      kinobase: new kinobase(this, object),
      collaps: new collaps(this, object),
      cdnmovies: new cdnmovies(this, object),
      filmix: new filmix(this, object),
      hdvb: new hdvb(this, object),
      videoapi: new videoapi(this, object)
    };
    var last;
    var last_filter;
    var extended;
    var selected_id;
    var filter_translate = {
      season: Lampa.Lang.translate('torrent_serial_season'),
      voice: Lampa.Lang.translate('torrent_parser_voice'),
      source: Lampa.Lang.translate('settings_rest_source')
    };
    var filter_sources = ['videocdn', 'rezka', 'rezka2', 'kinobase', 'collaps', 'filmix', 'videoapi']; // шаловливые ручки

    if (filter_sources.indexOf(balanser) == -1) {
      balanser = 'filmix';
      Lampa.Storage.set('online_mod_balanser', balanser);
    }

    scroll.body().addClass('torrent-list');

    function minus() {
      scroll.minus(window.innerWidth > 580 ? false : files.render().find('.files__left'));
    }

    window.addEventListener('resize', minus, false);
    minus();
    /**
     * Подготовка
     */

    this.create = function () {
      var _this = this;

      this.activity.loader(true);

      filter.onSearch = function (value) {
        Lampa.Activity.replace({
          search: value,
          search_date: '',
          clarification: true
        });
      };

      filter.onBack = function () {
        _this.start();
      };

      filter.render().find('.selector').on('hover:focus', function (e) {
        last_filter = e.target;
      });

      filter.onSelect = function (type, a, b) {
        if (type == 'filter') {
          if (a.reset) {
            if (extended) sources[balanser].reset();else _this.start();
          } else {
            sources[balanser].filter(type, a, b);
          }
        } else if (type == 'sort') {
          balanser = a.source;
          Lampa.Storage.set('online_mod_balanser', balanser);
          last_bls[object.movie.id] = balanser;

          if (Lampa.Storage.field('online_mod_save_last_balanser') !== false) {
            Lampa.Storage.set('online_mod_last_balanser', last_bls);
          }

          _this.search();

          setTimeout(Lampa.Select.close, 10);
        }
      };

      filter.render().find('.filter--sort span').text(Lampa.Lang.translate('online_mod_balanser'));
      filter.render();
      files.append(scroll.render());
      scroll.append(filter.render());
      this.search();
      return this.render();
    };
    /**
     * Начать поиск
     */


    this.search = function () {
      this.activity.loader(true);
      this.filter({
        source: filter_sources
      }, {
        source: 0
      });
      this.reset();
      this.find();
    };

    this.cleanTitle = function (str) {
      return str.replace(/[ .,:;!?]+/g, ' ').trim();
    };

    this.equalTitle = function (t1, t2) {
      return typeof t1 === 'string' && typeof t2 === 'string' && t1.toLowerCase().replace(/—/g, '-') === t2.toLowerCase().replace(/—/g, '-');
    };

    this.find = function () {
      var _this2 = this;

      var query = object.search || object.movie.title;
      var search_date = object.search_date || object.movie.release_date || object.movie.first_air_date || object.movie.last_air_date || '0000';
      var search_year = parseInt((search_date + '').slice(0, 4));
      var orig = object.movie.original_title || object.movie.original_name;

      var display = function display(items) {
        if (items && items.length) {
          var is_sure = false;

          if (object.movie.imdb_id) {
            var tmp = items.filter(function (elem) {
              return (elem.imdb_id || elem.imdbId) == object.movie.imdb_id;
            });

            if (tmp.length) {
              items = tmp;
              is_sure = true;
            }
          }

          var cards = items.filter(function (c) {
            var year = c.start_date || c.year || '0000';
            c.tmp_year = parseInt((year + '').slice(0, 4));
            return !c.tmp_year || !search_year || c.tmp_year > search_year - 2 && c.tmp_year < search_year + 2;
          });

          if (orig) {
            var _tmp = cards.filter(function (elem) {
              return _this2.equalTitle(elem.orig_title || elem.nameOriginal || elem.en_title || elem.nameEn || elem.ru_title || elem.nameRu, orig);
            });

            if (_tmp.length) {
              cards = _tmp;
              is_sure = true;
            }
          }

          if (query) {
            var _tmp2 = cards.filter(function (elem) {
              return _this2.equalTitle(elem.title || elem.ru_title || elem.nameRu || elem.en_title || elem.nameEn || elem.orig_title || elem.nameOriginal, query);
            });

            if (_tmp2.length) {
              cards = _tmp2;
              is_sure = true;
            }
          }

          if (cards.length > 1 && search_year) {
            var _tmp3 = cards.filter(function (c) {
              return c.tmp_year == search_year;
            });

            if (_tmp3.length) cards = _tmp3;
          }

          if (cards.length == 1 && is_sure) {
            _this2.extendChoice();

            sources[balanser].search(object, cards[0].kp_id || cards[0].kinopoiskId || cards[0].filmId, cards);
          } else {
            _this2.similars(items);

            _this2.loading(false);
          }
        } else _this2.emptyForQuery(query);
      };

      var vcdn_search = function vcdn_search() {
        var url;

        if (balanser == 'videoapi') {
          url = _this2.proxy('videoapi') + 'http://5100.svetacdn.in/api/short';
          url = Lampa.Utils.addUrlComponent(url, 'api_token=qR0taraBKvEZULgjoIRj69AJ7O6Pgl9O');
        } else {
          var prox = _this2.proxy('videocdn');

          url = prox ? prox + 'https://videocdn.tv/api/short' : 'http://cdn.svetacdn.in/api/short';
          url = Lampa.Utils.addUrlComponent(url, 'api_token=3i40G5TSECmLF77oAqnEgbx61ZWaOYaE');
        }

        var url_by_title = Lampa.Utils.addUrlComponent(url, 'title=' + encodeURIComponent(query));
        if (object.movie.imdb_id) url = Lampa.Utils.addUrlComponent(url, 'imdb_id=' + encodeURIComponent(object.movie.imdb_id));else url = url_by_title;
        network.clear();
        network.timeout(1000 * 15);
        network.silent(url, function (json) {
          if (json.data && json.data.length) display(json.data);else if (object.movie.imdb_id) {
            network.clear();
            network.timeout(1000 * 15);
            network.silent(url_by_title, function (json) {
              if (json.data && json.data.length) display(json.data);else display([]);
            }, function (a, c) {
              _this2.empty(network.errorDecode(a, c));
            });
          } else display([]);
        }, function (a, c) {
          _this2.empty(network.errorDecode(a, c));
        });
      };

      var kp_search = function kp_search() {
        var url = _this2.proxy('kp') + 'https://kinopoiskapiunofficial.tech/api/';
        var url_by_title = Lampa.Utils.addUrlComponent(url + 'v2.1/films/search-by-keyword', 'keyword=' + encodeURIComponent(_this2.cleanTitle(query)));
        if (object.movie.imdb_id) url = Lampa.Utils.addUrlComponent(url + 'v2.2/films', 'imdbId=' + encodeURIComponent(object.movie.imdb_id));else url = url_by_title;
        network.clear();
        network.timeout(1000 * 15);
        network.silent(url, function (json) {
          if (json.items && json.items.length) display(json.items);else if (json.films && json.films.length) display(json.films);else if (object.movie.imdb_id) {
            network.clear();
            network.timeout(1000 * 15);
            network.silent(url_by_title, function (json) {
              if (json.items && json.items.length) display(json.items);else if (json.films && json.films.length) display(json.films);else vcdn_search();
            }, function (a, c) {
              vcdn_search();
            }, false, {
              headers: {
                'X-API-KEY': '2d55adfd-019d-4567-bbf7-67d503f61b5a'
              }
            });
          } else vcdn_search();
        }, function (a, c) {
          vcdn_search();
        }, false, {
          headers: {
            'X-API-KEY': '2d55adfd-019d-4567-bbf7-67d503f61b5a'
          }
        });
      };

      var letgo = function letgo() {
        if (['rezka2', 'kinobase', 'filmix', 'cdnmovies'].indexOf(balanser) >= 0) {
          _this2.extendChoice();

          sources[balanser].search(object);
        } else {
          if (balanser == 'videocdn' || balanser == 'videoapi' || Lampa.Storage.field('online_mod_skip_kp_search') === true) vcdn_search();else kp_search();
        }
      };

      if (object.movie.kinopoisk_id && ['rezka', 'collaps', 'hdvb'].indexOf(balanser) >= 0) {
        this.extendChoice();
        sources[balanser].search(object, object.movie.kinopoisk_id);
      } else if (!object.movie.imdb_id && (object.movie.source == 'tmdb' || object.movie.source == 'cub') && ['videocdn', 'videoapi', 'cdnmovies'].indexOf(balanser) >= 0) {
        var tmdburl = (object.movie.name ? 'tv' : 'movie') + '/' + object.movie.id + '/external_ids?api_key=4ef0d7355d9ffb5151e987764708ce96&language=ru';
        var baseurl = typeof Lampa.TMDB !== 'undefined' ? Lampa.TMDB.api(tmdburl) : 'http://api.themoviedb.org/3/' + tmdburl;
        network.clear();
        network.timeout(1000 * 15);
        network.silent(baseurl, function (ttid) {
          object.movie.imdb_id = ttid.imdb_id;
          letgo();
        }, function (a, c) {
          _this2.empty(network.errorDecode(a, c));
        });
      } else {
        letgo();
      }
    };

    this.parsePlaylist = function (str) {
      var pl = [];

      try {
        if (str.charAt(0) === '[') {
          str.substring(1).split(',[').forEach(function (item) {
            var label_end = item.indexOf(']');

            if (label_end >= 0) {
              var label = item.substring(0, label_end);

              if (item.charAt(label_end + 1) === '{') {
                item.substring(label_end + 2).split(';{').forEach(function (voice_item) {
                  var voice_end = voice_item.indexOf('}');

                  if (voice_end >= 0) {
                    var voice = voice_item.substring(0, voice_end);
                    pl.push({
                      label: label,
                      voice: voice,
                      links: voice_item.substring(voice_end + 1).split(' or ')
                    });
                  }
                });
              } else {
                pl.push({
                  label: label,
                  links: item.substring(label_end + 1).split(' or ')
                });
              }
            }
          });
        }
      } catch (e) {}

      return pl;
    };

    this.parseM3U = function (str) {
      var pl = [];

      try {
        var width = 0;
        var height = 0;
        str.split('\n').forEach(function (line) {
          if (line.charAt(0) == '#') {
            var resolution = line.match(/\bRESOLUTION=(\d+)x(\d+)\b/);

            if (resolution) {
              width = parseInt(resolution[1]);
              height = parseInt(resolution[2]);
            }
          } else if (line.trim().length) {
            pl.push({
              width: width,
              height: height,
              link: line
            });
            width = 0;
            height = 0;
          }
        });
      } catch (e) {}

      return pl;
    };

    this.extendChoice = function () {
      var data = Lampa.Storage.cache('online_mod_choice_' + balanser, 500, {});
      var save = data[selected_id || object.movie.id] || {};
      extended = true;
      sources[balanser].extendChoice(save);
    };

    this.saveChoice = function (choice) {
      var data = Lampa.Storage.cache('online_mod_choice_' + balanser, 500, {});
      data[selected_id || object.movie.id] = choice;
      Lampa.Storage.set('online_mod_choice_' + balanser, data);
    };
    /**
     * Есть похожие карточки
     * @param {Object} json 
     */


    this.similars = function (json) {
      var _this3 = this;

      json.forEach(function (elem) {
        var title = elem.title || elem.ru_title || elem.nameRu || elem.en_title || elem.nameEn || elem.orig_title || elem.nameOriginal;
        var orig_title = elem.orig_title || elem.nameOriginal || elem.en_title || elem.nameEn;
        var year = elem.start_date || elem.year || '';
        var info = [];
        if (orig_title && orig_title != elem.title) info.push(orig_title);
        if (elem.seasons_count) info.push(Lampa.Lang.translate('online_mod_seasons_count') + ': ' + elem.seasons_count);
        if (elem.episodes_count) info.push(Lampa.Lang.translate('online_mod_episodes_count') + ': ' + elem.episodes_count);
        elem.title = title;
        elem.quality = year ? (year + '').slice(0, 4) : '----';
        elem.info = info.length ? ' / ' + info.join(' / ') : '';
        var item = Lampa.Template.get('online_mod_folder', elem);
        item.on('hover:enter', function () {
          _this3.activity.loader(true);

          _this3.reset();

          object.search = elem.title;
          object.search_date = year;
          selected_id = elem.id;

          _this3.extendChoice();

          sources[balanser].search(object, elem.kp_id || elem.kinopoiskId || elem.filmId, [elem]);
        });

        _this3.append(item);
      });
    };
    /**
     * Очистить список файлов
     */


    this.reset = function () {
      contextmenu_all = [];
      last = false;
      scroll.render().find('.empty').remove();
      filter.render().detach();
      scroll.clear();
      scroll.append(filter.render());
    };
    /**
     * Загрузка
     */


    this.loading = function (status) {
      if (status) this.activity.loader(true);else {
        this.activity.loader(false);
        this.activity.toggle();
      }
    };
    /**
     * Построить фильтр
     */


    this.filter = function (filter_items, choice) {
      var select = [];

      var add = function add(type, title) {
        var need = Lampa.Storage.get('online_mod_filter', '{}');
        var items = filter_items[type];
        var subitems = [];
        var value = need[type];
        items.forEach(function (name, i) {
          subitems.push({
            title: name,
            selected: value == i,
            index: i
          });
        });
        select.push({
          title: title,
          subtitle: items[value],
          items: subitems,
          stype: type
        });
      };

      filter_items.source = filter_sources;
      choice.source = filter_sources.indexOf(balanser);
      select.push({
        title: Lampa.Lang.translate('torrent_parser_reset'),
        reset: true
      });
      Lampa.Storage.set('online_mod_filter', choice);
      if (filter_items.voice && filter_items.voice.length) add('voice', Lampa.Lang.translate('torrent_parser_voice'));
      if (filter_items.season && filter_items.season.length) add('season', Lampa.Lang.translate('torrent_serial_season'));
      filter.set('filter', select);
      filter.set('sort', filter_sources.map(function (e) {
        return {
          title: e,
          source: e,
          selected: e == balanser
        };
      }));
      this.selected(filter_items);
    };
    /**
     * Закрыть фильтр
     */


    this.closeFilter = function () {
      if ($('body').hasClass('selectbox--open')) Lampa.Select.close();
    };
    /**
     * Показать что выбрано в фильтре
     */


    this.selected = function (filter_items) {
      var need = Lampa.Storage.get('online_mod_filter', '{}'),
          select = [];

      for (var i in need) {
        if (filter_items[i] && filter_items[i].length) {
          if (i == 'voice') {
            select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
          } else if (i !== 'source') {
            if (filter_items.season.length >= 1) {
              select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
            }
          }
        }
      }

      filter.chosen('filter', select);
      filter.chosen('sort', [balanser]);
    };
    /**
     * Добавить файл
     */


    this.append = function (item) {
      item.on('hover:focus', function (e) {
        last = e.target;
        scroll.update($(e.target), true);
      });
      scroll.append(item);
    };
    /**
     * Меню
     */


    this.contextmenu = function (params) {
      contextmenu_all.push(params);
      params.item.on('hover:long', function () {
        function copylink(extra) {
          if (extra.quality) {
            var qual = [];

            for (var i in extra.quality) {
              qual.push({
                title: i,
                file: extra.quality[i]
              });
            }

            Lampa.Select.show({
              title: 'Ссылки',
              items: qual,
              onBack: function onBack() {
                Lampa.Controller.toggle(enabled);
              },
              onSelect: function onSelect(b) {
                Lampa.Utils.copyTextToClipboard(b.file, function () {
                  Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
                }, function () {
                  Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
                });
              }
            });
          } else {
            Lampa.Utils.copyTextToClipboard(extra.file, function () {
              Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
            }, function () {
              Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
            });
          }
        }

        var enabled = Lampa.Controller.enabled().name;
        var menu = [{
          title: Lampa.Lang.translate('torrent_parser_label_title'),
          mark: true
        }, {
          title: Lampa.Lang.translate('torrent_parser_label_cancel_title'),
          clearmark: true
        }, {
          title: Lampa.Lang.translate('online_mod_clearmark_all'),
          clearmark_all: true
        }, {
          title: Lampa.Lang.translate('time_reset'),
          timeclear: true
        }, {
          title: Lampa.Lang.translate('online_mod_timeclear_all'),
          timeclear_all: true
        }];

        if (Lampa.Platform.is('webos')) {
          menu.push({
            title: Lampa.Lang.translate('player_lauch') + ' - Webos',
            player: 'webos'
          });
        }

        if (Lampa.Platform.is('android')) {
          menu.push({
            title: Lampa.Lang.translate('player_lauch') + ' - Android',
            player: 'android'
          });
        }

        menu.push({
          title: Lampa.Lang.translate('player_lauch') + ' - Lampa',
          player: 'lampa'
        });

        if (params.file) {
          menu.push({
            title: Lampa.Lang.translate('copy_link'),
            copylink: true
          });
        }

        if (Lampa.Account.working() && params.element && typeof params.element.season !== 'undefined' && Lampa.Account.subscribeToTranslation) {
          menu.push({
            title: Lampa.Lang.translate('online_mod_voice_subscribe'),
            subscribe: true
          });
        }

        Lampa.Select.show({
          title: Lampa.Lang.translate('title_action'),
          items: menu,
          onBack: function onBack() {
            Lampa.Controller.toggle(enabled);
          },
          onSelect: function onSelect(a) {
            if (a.clearmark) {
              Lampa.Arrays.remove(params.viewed, params.hash_file);
              Lampa.Storage.set('online_view', params.viewed);
              params.item.find('.torrent-item__viewed').remove();
            }

            if (a.clearmark_all) {
              contextmenu_all.forEach(function (params) {
                Lampa.Arrays.remove(params.viewed, params.hash_file);
                Lampa.Storage.set('online_view', params.viewed);
                params.item.find('.torrent-item__viewed').remove();
              });
            }

            if (a.mark) {
              if (params.viewed.indexOf(params.hash_file) == -1) {
                params.viewed.push(params.hash_file);
                params.item.append('<div class="torrent-item__viewed">' + Lampa.Template.get('icon_star', {}, true) + '</div>');
                Lampa.Storage.set('online_view', params.viewed);
              }
            }

            if (a.timeclear) {
              params.view.percent = 0;
              params.view.time = 0;
              params.view.duration = 0;
              Lampa.Timeline.update(params.view);
            }

            if (a.timeclear_all) {
              contextmenu_all.forEach(function (params) {
                params.view.percent = 0;
                params.view.time = 0;
                params.view.duration = 0;
                Lampa.Timeline.update(params.view);
              });
            }

            Lampa.Controller.toggle(enabled);

            if (a.player) {
              Lampa.Player.runas(a.player);
              params.item.trigger('hover:enter');
            }

            if (a.copylink) {
              params.file(copylink);
            }

            if (a.subscribe) {
              Lampa.Account.subscribeToTranslation({
                card: object.movie,
                season: params.element.season,
                episode: params.element.translate_episode_end,
                voice: params.element.translate_voice
              }, function () {
                Lampa.Noty.show(Lampa.Lang.translate('online_mod_voice_success'));
              }, function () {
                Lampa.Noty.show(Lampa.Lang.translate('online_mod_voice_error'));
              });
            }
          }
        });
      }).on('hover:focus', function () {
        if (Lampa.Helper) Lampa.Helper.show('online_file', Lampa.Lang.translate('online_mod_file_helper'), params.item);
      });
    };
    /**
     * Показать пустой результат
     */


    this.empty = function (msg) {
      var empty = Lampa.Template.get('list_empty');
      if (msg) empty.find('.empty__descr').text(msg);
      scroll.append(empty);
      this.loading(false);
    };
    /**
     * Показать пустой результат по ключевому слову
     */


    this.emptyForQuery = function (query) {
      this.empty(Lampa.Lang.translate('online_mod_query_start') + ' (' + query + ') ' + Lampa.Lang.translate('online_mod_query_end'));
    };

    this.getLastEpisode = function (items) {
      var last_episode = 0;
      items.forEach(function (e) {
        if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode));
      });
      return last_episode;
    };
    /**
     * Начать навигацию по файлам
     */


    this.start = function (first_select) {
      if (Lampa.Activity.active().activity !== this.activity) return; //обязательно, иначе наблюдается баг, активность создается но не стартует, в то время как компонент загружается и стартует самого себя.

      if (first_select) {
        var last_views = scroll.render().find('.selector.online').find('.torrent-item__viewed').parent().last();
        if (object.movie.number_of_seasons && last_views.length) last = last_views.eq(0)[0];else last = scroll.render().find('.selector').eq(3)[0];
      }

      Lampa.Background.immediately(Lampa.Utils.cardImgBackground(object.movie));
      Lampa.Controller.add('content', {
        toggle: function toggle() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        up: function up() {
          if (Navigator.canmove('up')) {
            if (scroll.render().find('.selector').slice(3).index(last) == 0 && last_filter) {
              Lampa.Controller.collectionFocus(last_filter, scroll.render());
            } else Navigator.move('up');
          } else Lampa.Controller.toggle('head');
        },
        down: function down() {
          Navigator.move('down');
        },
        right: function right() {
          if (Navigator.canmove('right')) Navigator.move('right');else filter.show(Lampa.Lang.translate('title_filter'), 'filter');
        },
        left: function left() {
          if (Navigator.canmove('left')) Navigator.move('left');else Lampa.Controller.toggle('menu');
        },
        back: this.back
      });
      Lampa.Controller.toggle('content');
    };

    this.render = function () {
      return files.render();
    };

    this.back = function () {
      Lampa.Activity.backward();
    };

    this.pause = function () {};

    this.stop = function () {};

    this.destroy = function () {
      network.clear();
      files.destroy();
      scroll.destroy();
      network = null;
      sources.videocdn.destroy();
      sources.rezka.destroy();
      sources.rezka2.destroy();
      sources.kinobase.destroy();
      sources.collaps.destroy();
      sources.cdnmovies.destroy();
      sources.filmix.destroy();
      sources.hdvb.destroy();
      sources.videoapi.destroy();
      window.removeEventListener('resize', minus);
    };
  }

  if (!Lampa.Lang) {
    var lang_data = {};
    Lampa.Lang = {
      add: function add(data) {
        lang_data = data;
      },
      translate: function translate(key) {
        return lang_data[key] ? lang_data[key].ru : key;
      }
    };
  }

  Lampa.Lang.add({
    online_mod_nolink: {
      ru: 'Не удалось извлечь ссылку',
      uk: 'Неможливо отримати посилання',
      be: 'Не ўдалося атрымаць спасылку',
      en: 'Failed to fetch link',
      zh: '获取链接失败'
    },
    online_mod_waitlink: {
      ru: 'Работаем над извлечением ссылки, подождите...',
      uk: 'Працюємо над отриманням посилання, зачекайте...',
      be: 'Працуем над выманнем спасылкі, пачакайце...',
      en: 'Working on extracting the link, please wait...',
      zh: '正在提取链接，请稍候...'
    },
    online_mod_balanser: {
      ru: 'Балансер',
      uk: 'Балансер',
      be: 'Балансер',
      en: 'Balancer',
      zh: '平衡器'
    },
    online_mod_file_helper: {
      ru: 'Удерживайте клавишу "ОК" для вызова контекстного меню',
      uk: 'Утримуйте клавішу "ОК" для виклику контекстного меню',
      be: 'Утрымлівайце клавішу "ОК" для выкліку кантэкстнага меню',
      en: 'Hold the "OK" key to bring up the context menu',
      zh: '按住“确定”键调出上下文菜单'
    },
    online_mod_clearmark_all: {
      ru: 'Снять отметку у всех',
      uk: 'Зняти позначку у всіх',
      be: 'Зняць адзнаку ва ўсіх',
      en: 'Uncheck all',
      zh: '取消所有'
    },
    online_mod_timeclear_all: {
      ru: 'Сбросить тайм-код у всех',
      uk: 'Скинути тайм-код у всіх',
      be: 'Скінуць тайм-код ва ўсіх',
      en: 'Reset timecode for all',
      zh: '为所有人重置时间码'
    },
    online_mod_query_start: {
      ru: 'По запросу',
      uk: 'На запит',
      be: 'Па запыце',
      en: 'On request',
      zh: '根据要求'
    },
    online_mod_query_end: {
      ru: 'нет результатов',
      uk: 'немає результатів',
      be: 'няма вынікаў',
      en: 'no results',
      zh: '没有结果'
    },
    online_mod_title: {
      ru: 'Онлайн',
      uk: 'Онлайн',
      be: 'Анлайн',
      en: 'Online',
      zh: '在线的'
    },
    online_mod_title_full: {
      ru: 'Онлайн Мод',
      uk: 'Онлайн Мод',
      be: 'Анлайн Мод',
      en: 'Online Mod',
      zh: '在线的 Mod'
    },
    online_mod_proxy_other: {
      ru: 'Использовать альтернативный прокси',
      uk: 'Використовувати альтернативний проксі',
      be: 'Выкарыстоўваць альтэрнатыўны проксі',
      en: 'Use an alternative proxy',
      zh: '使用备用代理'
    },
    online_mod_proxy_balanser: {
      ru: 'Проксировать',
      uk: 'Проксирувати',
      be: 'Праксіраваць',
      en: 'Proxy',
      zh: '代理'
    },
    online_mod_proxy_kp: {
      ru: 'Проксировать КиноПоиск',
      uk: 'Проксирувати КиноПоиск',
      be: 'Праксіраваць КиноПоиск',
      en: 'Proxy KinoPoisk',
      zh: '代理 KinoPoisk'
    },
    online_mod_skip_kp_search: {
      ru: 'Не искать в КиноПоиск',
      uk: 'Не шукати у КиноПоиск',
      be: 'Не шукаць у КиноПоиск',
      en: 'Skip search in KinoPoisk',
      zh: '在 KinoPoisk 中跳过搜索'
    },
    online_mod_prefer_mp4: {
      ru: 'Предпочитать поток MP4',
      uk: 'Віддавати перевагу потіку MP4',
      be: 'Аддаваць перавагу патоку MP4',
      en: 'Prefer MP4 stream',
      zh: '更喜欢 MP4 流'
    },
    online_mod_prefer_dash: {
      ru: 'Предпочитать DASH вместо HLS',
      uk: 'Віддавати перевагу DASH замість HLS',
      be: 'Аддаваць перавагу DASH замест HLS',
      en: 'Prefer DASH over HLS',
      zh: '比 HLS 更喜欢 DASH'
    },
    online_mod_save_last_balanser: {
      ru: 'Сохранять историю балансеров',
      uk: 'Зберігати історію балансерів',
      be: 'Захоўваць гісторыю балансараў',
      en: 'Save history of balancers',
      zh: '保存平衡器的历史记录'
    },
    online_mod_clear_last_balanser: {
      ru: 'Очистить историю балансеров',
      uk: 'Очистити історію балансерів',
      be: 'Ачысціць гісторыю балансараў',
      en: 'Clear history of balancers',
      zh: '清除平衡器的历史记录'
    },
    online_mod_rezka2_mirror: {
      ru: 'Зеркало для rezka2',
      uk: 'Дзеркало для rezka2',
      be: 'Люстэрка для rezka2',
      en: 'Mirror for rezka2',
      zh: 'rezka2的镜子'
    },
    online_mod_rezka2_name: {
      ru: 'Логин или email для rezka2',
      uk: 'Логін чи email для rezka2',
      be: 'Лагін ці email для rezka2',
      en: 'Login or email for rezka2',
      zh: 'rezka2的登录或电子邮件'
    },
    online_mod_rezka2_password: {
      ru: 'Пароль для rezka2',
      uk: 'Пароль для rezka2',
      be: 'Пароль для rezka2',
      en: 'Password for rezka2',
      zh: 'rezka2的密码'
    },
    online_mod_rezka2_login: {
      ru: 'Войти в rezka2',
      uk: 'Увійти до rezka2',
      be: 'Увайсці ў rezka2',
      en: 'Log in to rezka2',
      zh: '登录rezka2'
    },
    online_mod_rezka2_logout: {
      ru: 'Выйти из rezka2',
      uk: 'Вийти з rezka2',
      be: 'Выйсці з rezka2',
      en: 'Log out of rezka2',
      zh: '注销rezka2'
    },
    online_mod_seasons_count: {
      ru: 'Сезонов',
      uk: 'Сезонів',
      be: 'Сезонаў',
      en: 'Seasons',
      zh: '季'
    },
    online_mod_episodes_count: {
      ru: 'Эпизодов',
      uk: 'Епізодів',
      be: 'Эпізодаў',
      en: 'Episodes',
      zh: '集'
    },
    online_mod_filmix_param_add_title: {
      ru: 'Добавить ТОКЕН от Filmix',
      uk: 'Додати ТОКЕН від Filmix',
      be: 'Дадаць ТОКЕН ад Filmix',
      en: 'Add TOKEN from Filmix',
      zh: '从 Filmix 添加 TOKEN'
    },
    online_mod_filmix_param_add_descr: {
      ru: 'Добавьте ТОКЕН для подключения подписки',
      uk: 'Додайте ТОКЕН для підключення передплати',
      be: 'Дадайце ТОКЕН для падлучэння падпіскі',
      en: 'Add a TOKEN to connect a subscription',
      zh: '添加 TOKEN 以连接订阅'
    },
    online_mod_filmix_param_placeholder: {
      ru: 'Например: nxjekeb57385b..',
      uk: 'Наприклад: nxjekeb57385b..',
      be: 'Напрыклад: nxjekeb57385b..',
      en: 'For example: nxjekeb57385b..',
      zh: '例如： nxjekeb57385b..'
    },
    online_mod_filmix_param_add_device: {
      ru: 'Добавить устройство на Filmix',
      uk: 'Додати пристрій на Filmix',
      be: 'Дадаць прыладу на Filmix',
      en: 'Add Device to Filmix',
      zh: '将设备添加到 Filmix'
    },
    online_mod_filmix_modal_text: {
      ru: 'Введите его на странице https://filmix.ac/consoles в вашем авторизованном аккаунте!',
      uk: 'Введіть його на сторінці https://filmix.ac/consoles у вашому авторизованому обліковому записі!',
      be: 'Увядзіце яго на старонцы https://filmix.ac/consoles у вашым аўтарызаваным акаўнце!',
      en: 'Enter it at https://filmix.ac/consoles in your authorized account!',
      zh: '在您的授权帐户中的 https://filmix.ac/consoles 中输入！'
    },
    online_mod_filmix_modal_wait: {
      ru: 'Ожидаем код',
      uk: 'Очікуємо код',
      be: 'Чакаем код',
      en: 'Waiting for the code',
      zh: '等待代码'
    },
    online_mod_filmix_copy_secuses: {
      ru: 'Код скопирован в буфер обмена',
      uk: 'Код скопійовано в буфер обміну',
      be: 'Код скапіяваны ў буфер абмену',
      en: 'Code copied to clipboard',
      zh: '代码复制到剪贴板'
    },
    online_mod_filmix_copy_fail: {
      ru: 'Ошибка при копировании',
      uk: 'Помилка при копіюванні',
      be: 'Памылка пры капіяванні',
      en: 'Copy error',
      zh: '复制错误'
    },
    online_mod_filmix_nodevice: {
      ru: 'Устройство не авторизовано',
      uk: 'Пристрій не авторизований',
      be: 'Прылада не аўтарызавана',
      en: 'Device not authorized',
      zh: '设备未授权'
    },
    online_mod_filmix_status: {
      ru: 'Статус',
      uk: 'Статус',
      be: 'Статус',
      en: 'Status',
      zh: '状态'
    },
    online_mod_voice_subscribe: {
      ru: 'Подписаться на перевод',
      uk: 'Підписатися на переклад',
      be: 'Падпісацца на пераклад',
      en: 'Subscribe to translation',
      zh: '订阅翻译'
    },
    online_mod_voice_success: {
      ru: 'Вы успешно подписались',
      uk: 'Ви успішно підписалися',
      be: 'Вы паспяхова падпісаліся',
      en: 'You have successfully subscribed',
      zh: '您已成功订阅'
    },
    online_mod_voice_error: {
      ru: 'Возникла ошибка',
      uk: 'Виникла помилка',
      be: 'Узнікла памылка',
      en: 'An error has occurred',
      zh: '发生了错误'
    }
  });

  function resetTemplates() {
    Lampa.Template.add('online_mod', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div style=\"position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em\">\n                <svg style=\"height: 2.4em; width:  2.4em;\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <circle cx=\"64\" cy=\"64\" r=\"56\" stroke=\"white\" stroke-width=\"16\"/>\n                    <path d=\"M90.5 64.3827L50 87.7654L50 41L90.5 64.3827Z\" fill=\"white\"/>\n                </svg>\n            </div>\n            <div class=\"online__title\" style=\"padding-left: 2.1em;\">{title}</div>\n            <div class=\"online__quality\" style=\"padding-left: 3.4em;\">{quality}{info}</div>\n        </div>\n    </div>");
    Lampa.Template.add('online_mod_folder', "<div class=\"online selector\">\n        <div class=\"online__body\">\n            <div style=\"position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em\">\n                <svg style=\"height: 2.4em; width:  2.4em;\" viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"/>\n                    <path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"/>\n                    <rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"/>\n                </svg>\n            </div>\n            <div class=\"online__title\" style=\"padding-left: 2.1em;\">{title}</div>\n            <div class=\"online__quality\" style=\"padding-left: 3.4em;\">{quality}{info}</div>\n        </div>\n    </div>");
  }

  var button = "<div class=\"full-start__button selector view--online_mod\" data-subtitle=\"online_mod 16.11.2022\">\n    <svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:svgjs=\"http://svgjs.com/svgjs\" version=\"1.1\" width=\"512\" height=\"512\" x=\"0\" y=\"0\" viewBox=\"0 0 244 260\" style=\"enable-background:new 0 0 512 512\" xml:space=\"preserve\" class=\"\">\n    <g xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M242,88v170H10V88h41l-38,38h37.1l38-38h38.4l-38,38h38.4l38-38h38.3l-38,38H204L242,88L242,88z M228.9,2l8,37.7l0,0 L191.2,10L228.9,2z M160.6,56l-45.8-29.7l38-8.1l45.8,29.7L160.6,56z M84.5,72.1L38.8,42.4l38-8.1l45.8,29.7L84.5,72.1z M10,88 L2,50.2L47.8,80L10,88z\" fill=\"currentColor\"/>\n    </g></svg>\n\n    <span>#{online_mod_title}</span>\n    </div>"; // нужна заглушка, а то при страте лампы говорит пусто

  Lampa.Component.add('online_mod', component); //то же самое

  resetTemplates();
  Lampa.Listener.follow('full', function (e) {
    if (e.type == 'complite') {
      var btn = $(Lampa.Lang.translate(button));
      btn.on('hover:enter', function () {
        resetTemplates();
        Lampa.Component.add('online_mod', component);
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('online_mod_title_full'),
          component: 'online_mod',
          search: e.data.movie.title,
          search_one: e.data.movie.title,
          search_two: e.data.movie.original_title,
          movie: e.data.movie,
          page: 1
        });
      });
      e.object.activity.render().find('.view--torrent').after(btn);
    }
  }); ///////FILMIX/////////

  var network = new Lampa.Reguest();
  var api_url = 'http://filmixapp.cyou/api/v2/';
  var user_dev = '?user_dev_apk=2.0.1&user_dev_id=' + Lampa.Utils.uid(16) + '&user_dev_name=Xiaomi&user_dev_os=12&user_dev_vendor=Xiaomi&user_dev_token=';
  var ping_auth;
  Lampa.Params.select('filmix_token', '', '');
  Lampa.Template.add('settings_filmix', "<div>\n    <div class=\"settings-param selector\" data-name=\"filmix_token\" data-type=\"input\" placeholder=\"#{online_mod_filmix_param_placeholder}\">\n        <div class=\"settings-param__name\">#{online_mod_filmix_param_add_title}</div>\n        <div class=\"settings-param__value\"></div>\n        <div class=\"settings-param__descr\">#{online_mod_filmix_param_add_descr}</div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"filmix_add\" data-static=\"true\">\n        <div class=\"settings-param__name\">#{online_mod_filmix_param_add_device}</div>\n    </div>\n</div>");
  Lampa.Storage.listener.follow('change', function (e) {
    if (e.name == 'filmix_token') {
      if (e.value) checkPro(e.value);else {
        Lampa.Storage.set("filmix_status", {});
        showStatus();
      }
    }
  });

  function addSettingsFilmix() {
    if (Lampa.Settings.main && Lampa.Settings.main() && !Lampa.Settings.main().render().find('[data-component="filmix"]').length) {
      var field = $("<div class=\"settings-folder selector\" data-component=\"filmix\">\n            <div class=\"settings-folder__icon\">\n                <svg height=\"57\" viewBox=\"0 0 58 57\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <path d=\"M20 20.3735V45H26.8281V34.1262H36.724V26.9806H26.8281V24.3916C26.8281 21.5955 28.9062 19.835 31.1823 19.835H39V13H26.8281C23.6615 13 20 15.4854 20 20.3735Z\" fill=\"white\"/>\n                <rect x=\"2\" y=\"2\" width=\"54\" height=\"53\" rx=\"5\" stroke=\"white\" stroke-width=\"4\"/>\n                </svg>\n            </div>\n            <div class=\"settings-folder__name\">Filmix</div>\n        </div>");
      Lampa.Settings.main().render().find('[data-component="more"]').after(field);
      Lampa.Settings.main().update();
    }
  }

  if (window.appready) addSettingsFilmix();else {
    Lampa.Listener.follow('app', function (e) {
      if (e.type == 'ready') addSettingsFilmix();
    });
  }
  Lampa.Settings.listener.follow('open', function (e) {
    if (e.name == 'filmix') {
      e.body.find('[data-name="filmix_add"]').unbind('hover:enter').on('hover:enter', function () {
        var user_code = '';
        var user_token = '';
        var modal = $('<div><div class="broadcast__text">' + Lampa.Lang.translate('online_mod_filmix_modal_text') + '</div><div class="broadcast__device selector" style="text-align: center">' + Lampa.Lang.translate('online_mod_filmix_modal_wait') + '...</div><br><div class="broadcast__scan"><div></div></div></div></div>');
        Lampa.Modal.open({
          title: '',
          html: modal,
          onBack: function onBack() {
            Lampa.Modal.close();
            Lampa.Controller.toggle('settings_component');
            clearInterval(ping_auth);
          },
          onSelect: function onSelect() {
            Lampa.Utils.copyTextToClipboard(user_code, function () {
              Lampa.Noty.show(Lampa.Lang.translate('online_mod_filmix_copy_secuses'));
            }, function () {
              Lampa.Noty.show(Lampa.Lang.translate('online_mod_filmix_copy_fail'));
            });
          }
        });
        ping_auth = setInterval(function () {
          checkPro(user_token, function () {
            Lampa.Modal.close();
            clearInterval(ping_auth);
            Lampa.Storage.set("filmix_token", user_token);
            e.body.find('[data-name="filmix_token"] .settings-param__value').text(user_token);
            Lampa.Controller.toggle('settings_component');
          });
        }, 10000);
        network.clear();
        network.timeout(10000);
        network.quiet(api_url + 'token_request' + user_dev, function (found) {
          if (found.status == 'ok') {
            user_token = found.code;
            user_code = found.user_code;
            modal.find('.selector').text(user_code); //modal.find('.broadcast__scan').remove()
          } else {
            Lampa.Noty.show(found);
          }
        }, function (a, c) {
          Lampa.Noty.show(network.errorDecode(a, c));
        });
      });
      showStatus();
    }
  });

  function showStatus() {
    var status = Lampa.Storage.get("filmix_status", '{}');
    var info = Lampa.Lang.translate('online_mod_filmix_nodevice');

    if (status.login) {
      if (status.is_pro) info = status.login + ' - PRO ' + Lampa.Lang.translate('filter_rating_to') + ' - ' + status.pro_date;else if (status.is_pro_plus) info = status.login + ' - PRO_PLUS ' + Lampa.Lang.translate('filter_rating_to') + ' - ' + status.pro_date;else info = status.login + ' - NO PRO';
    }

    var field = $(Lampa.Lang.translate("\n        <div class=\"settings-param\" data-name=\"filmix_status\" data-static=\"true\">\n            <div class=\"settings-param__name\">#{online_mod_filmix_status}</div>\n            <div class=\"settings-param__value\">".concat(info, "</div>\n        </div>")));
    $('.settings [data-name="filmix_status"]').remove();
    $('.settings [data-name="filmix_add"]').after(field);
  }

  function checkPro(token, call) {
    network.clear();
    network.timeout(8000);
    network.silent(api_url + 'user_profile' + user_dev + token, function (json) {
      if (json) {
        if (json.user_data) {
          Lampa.Storage.set("filmix_status", json.user_data);
          if (call) call();
        } else {
          Lampa.Storage.set("filmix_status", {});
        }

        showStatus();
      }
    }, function (a, c) {
      Lampa.Noty.show(network.errorDecode(a, c));
    });
  }

  function rezka2Mirror() {
    var url = Lampa.Storage.get('online_mod_rezka2_mirror', '');
    if (!url) return 'https://hdrezka.ag/';
    if (url.indexOf('://') == -1) url = 'https://' + url;
    if (url.charAt(url.length - 1) != '/') url += '/';
    return url;
  } ///////Rezka2/////////


  function rezka2Login(success, error) {
    var url = rezka2Mirror() + 'ajax/login/';
    var postdata = 'login_name=' + encodeURIComponent(Lampa.Storage.get('online_mod_rezka2_name', ''));
    postdata += '&login_password=' + encodeURIComponent(Lampa.Storage.get('online_mod_rezka2_password', ''));
    postdata += '&login_not_save=0';
    network.clear();
    network.timeout(8000);
    network.silent(url, function (json) {
      if (json && (json.success || json.message == 'Уже авторизован на сайте. Необходимо обновить страницу!')) {
        Lampa.Storage.set("online_mod_rezka2_status", 'true');
        if (success) success();
      } else {
        Lampa.Storage.set("online_mod_rezka2_status", 'false');
        if (json && json.message) Lampa.Noty.show(json.message);
        if (error) error();
      }
    }, function (a, c) {
      Lampa.Noty.show(network.errorDecode(a, c));
      if (error) error();
    }, postdata, {
      withCredentials: true
    });
  }

  function rezka2Logout(success, error) {
    var url = rezka2Mirror() + 'logout/';
    network.clear();
    network.timeout(8000);
    network.silent(url, function (str) {
      Lampa.Storage.set("online_mod_rezka2_status", 'false');
      if (success) success();
    }, function (a, c) {
      Lampa.Noty.show(network.errorDecode(a, c));
      if (error) error();
    }, false, {
      dataType: 'text',
      withCredentials: true
    });
  } ///////Онлайн Мод/////////


  Lampa.Params.trigger('online_mod_proxy_other', false);
  Lampa.Params.trigger('online_mod_proxy_videocdn', false);
  Lampa.Params.trigger('online_mod_proxy_rezka', false);
  Lampa.Params.trigger('online_mod_proxy_rezka2', false);
  Lampa.Params.trigger('online_mod_proxy_kinobase', false);
  Lampa.Params.trigger('online_mod_proxy_collaps', false);
  Lampa.Params.trigger('online_mod_proxy_videoapi', false);
  Lampa.Params.trigger('online_mod_proxy_kp', false);
  Lampa.Params.trigger('online_mod_skip_kp_search', false);
  Lampa.Params.trigger('online_mod_prefer_mp4', true);
  Lampa.Params.trigger('online_mod_prefer_dash', false);
  Lampa.Params.trigger('online_mod_save_last_balanser', true);
  Lampa.Params.select('online_mod_rezka2_mirror', '', '');
  Lampa.Params.select('online_mod_rezka2_name', '', '');
  Lampa.Params.select('online_mod_rezka2_password', '', '');
  Lampa.Template.add('settings_online_mod', "<div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_proxy_other\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_proxy_other}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_proxy_videocdn\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_proxy_balanser} videocdn</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_proxy_rezka\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_proxy_balanser} rezka</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_proxy_rezka2\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_proxy_balanser} rezka2</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_proxy_kinobase\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_proxy_balanser} kinobase</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_proxy_collaps\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_proxy_balanser} collaps</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_proxy_videoapi\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_proxy_balanser} videoapi</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_proxy_kp\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_proxy_kp}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_skip_kp_search\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_skip_kp_search}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_prefer_mp4\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_prefer_mp4}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_prefer_dash\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_prefer_dash}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_save_last_balanser\" data-type=\"toggle\">\n        <div class=\"settings-param__name\">#{online_mod_save_last_balanser}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_clear_last_balanser\" data-static=\"true\">\n        <div class=\"settings-param__name\">#{online_mod_clear_last_balanser}</div>\n        <div class=\"settings-param__status\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_rezka2_mirror\" data-type=\"input\" placeholder=\"#{settings_cub_not_specified}\">\n        <div class=\"settings-param__name\">#{online_mod_rezka2_mirror}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_rezka2_name\" data-type=\"input\" placeholder=\"#{settings_cub_not_specified}\">\n        <div class=\"settings-param__name\">#{online_mod_rezka2_name}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_rezka2_password\" data-type=\"input\" data-string=\"true\" placeholder=\"#{settings_cub_not_specified}\">\n        <div class=\"settings-param__name\">#{online_mod_rezka2_password}</div>\n        <div class=\"settings-param__value\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_rezka2_login\" data-static=\"true\">\n        <div class=\"settings-param__name\">#{online_mod_rezka2_login}</div>\n        <div class=\"settings-param__status\"></div>\n    </div>\n    <div class=\"settings-param selector\" data-name=\"online_mod_rezka2_logout\" data-static=\"true\">\n        <div class=\"settings-param__name\">#{online_mod_rezka2_logout}</div>\n        <div class=\"settings-param__status\"></div>\n    </div>\n</div>");

  function addSettingsOnlineMod() {
    if (Lampa.Settings.main && Lampa.Settings.main() && !Lampa.Settings.main().render().find('[data-component="online_mod"]').length) {
      var field = $(Lampa.Lang.translate("<div class=\"settings-folder selector\" data-component=\"online_mod\">\n            <div class=\"settings-folder__icon\">\n                <svg height=\"260\" viewBox=\"0 0 244 260\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <path d=\"M242,88v170H10V88h41l-38,38h37.1l38-38h38.4l-38,38h38.4l38-38h38.3l-38,38H204L242,88L242,88z M228.9,2l8,37.7l0,0 L191.2,10L228.9,2z M160.6,56l-45.8-29.7l38-8.1l45.8,29.7L160.6,56z M84.5,72.1L38.8,42.4l38-8.1l45.8,29.7L84.5,72.1z M10,88 L2,50.2L47.8,80L10,88z\" fill=\"white\"/>\n                </svg>\n            </div>\n            <div class=\"settings-folder__name\">#{online_mod_title_full}</div>\n        </div>"));
      Lampa.Settings.main().render().find('[data-component="more"]').after(field);
      Lampa.Settings.main().update();
    }
  }

  if (window.appready) addSettingsOnlineMod();else {
    Lampa.Listener.follow('app', function (e) {
      if (e.type == 'ready') addSettingsOnlineMod();
    });
  }
  Lampa.Settings.listener.follow('open', function (e) {
    if (e.name == 'online_mod') {
      var clear_last_balanser = e.body.find('[data-name="online_mod_clear_last_balanser"]');
      clear_last_balanser.unbind('hover:enter').on('hover:enter', function () {
        Lampa.Storage.set('online_mod_last_balanser', {});
        $('.settings-param__status', clear_last_balanser).removeClass('active error wait').addClass('active');
      });
      var rezka2_login = e.body.find('[data-name="online_mod_rezka2_login"]');
      rezka2_login.unbind('hover:enter').on('hover:enter', function () {
        var rezka2_login_status = $('.settings-param__status', rezka2_login).removeClass('active error wait').addClass('wait');
        rezka2Login(function () {
          rezka2_login_status.removeClass('active error wait').addClass('active');
        }, function () {
          rezka2_login_status.removeClass('active error wait').addClass('error');
        });
      });
      var rezka2_logout = e.body.find('[data-name="online_mod_rezka2_logout"]');
      rezka2_logout.unbind('hover:enter').on('hover:enter', function () {
        var rezka2_logout_status = $('.settings-param__status', rezka2_logout).removeClass('active error wait').addClass('wait');
        rezka2Logout(function () {
          rezka2_logout_status.removeClass('active error wait').addClass('active');
        }, function () {
          rezka2_logout_status.removeClass('active error wait').addClass('error');
        });
      });
    }
  });

})();
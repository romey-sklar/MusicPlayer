
angular.module('Player.player', ['ngRoute'])
  .config(['$routeProvider', ($routeProvider) => {
    $routeProvider.when('/player', {
      templateUrl: 'player/player.html', controller: 'Playerctrl'
    }).when('/player/light', {
      templateUrl: 'player/themes/light/index.html', controller: 'Playerctrl'
    })
  }])
  .controller('Playerctrl', ['$scope', '$location', function ($scope, $location) {
    $scope.musicSelected = false;
    $scope.trackName = null;
    $scope.songList = null;
    $scope.songCategories = null;
    $scope.playersByCategory = null;
    $scope.songPlaying = false;
    $scope.playListVisible = false;
    $scope.shuffle = true;
    $scope.mute = false;
    $scope.theme = "dark";
    // $scope.playMusic();

    var slider = document.getElementById("myRange");
    var sk = document.getElementById('seek');
    var checkbox = document.getElementById("checkboxrn")

    const ipc = require('electron').ipcRenderer;
    const jsmediatags = require("jsmediatags");
    const fs = require('fs')
    const path = require('path')
    const storage = require('electron-json-storage');

    const dataPath = storage.getDataPath();

    // fs.readFile('theme.txt', 'utf-8', function (err, buf) {
    //   if (err)
    //     return
    //   var temp = buf.toString();
    //   if(temp == "light")
    //     $location.path('/player/light')
    //   console.log(temp);
    // });

    storage.has('path', function (error, hasKey) {
      if (error) throw error;
      if (hasKey) {
        storage.get('path', function (error, data) {
          if (error) throw error;
          console.log(data);
          scanDir([data.path.toString()]);
        });
      }
    })

    storage.has('theme', function (error, hasKey) {
      if (error) throw error;
      if (hasKey) {
        storage.get('theme', function (error, data) {
          if (error) throw error;
          console.log(data);
          if (data.theme == "light") {
            // $location.path('/player/light')
            $scope.theme = 'light'
            document.body.style.backgroundColor = "#F5F5F5"
            document.body.style.color = "#212529"
            var icons = document.body.querySelectorAll("svg");
            console.log(icons);

            icons.forEach(icon => {
              icon.style.color = "#212529";
            });

          }
          else if (data.theme == "disco") {
            $scope.theme = 'disco'
          }
        });
      }
    })

    // fs.readFile('path.txt', 'utf-8', function (err, buf) {
    //   if (err) {
    //     return
    //   }
    //   var temp = [buf.toString()];
    //   scanDir(temp);

    //   console.log(temp);

    // });

    var walkSync = function (dir, filelist) {
      files = fs.readdirSync(dir);
      filelist = filelist || [];
      files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
          filelist = walkSync(path.join(dir, file), filelist);
        }
        else {
          if (file.substr(-4) === '.mp3' || file.substr(-4) === '.m4a'
            || file.substr(-5) === '.webm' || file.substr(-4) === '.wav'
            || file.substr(-4) === '.aac' || file.substr(-4) === '.ogg'
            || file.substr(-5) === '.opus') {
            filelist.push(path.join(dir, file));
          }
        }
      });
      return filelist;
    };

    function scanDir(filePath) {
      if (!filePath || filePath[0] == 'undefined') return;

      var arr = walkSync(filePath[0]);

      var arg = {};
      arg.files = arr;
      arg.path = filePath;

      startPlayer(arg)
    }
    function themeChange() {
      $location.path('/player/light')
    }
    ipc.on('theme-change', function (event, arg) {
      // $location.path('/player/light')

      themeChange()
    });

    ipc.on('selected-files', function (event, arg) {
      // console.log(arg)

      startPlayer(arg)

    });

    function startPlayer(arg) {

      if ($scope.songPlaying) {
        $scope.songPlaying = false;
        $scope.player.pause();
      }
      $scope.songList = arg;
      var songCategories = {
        noLetters: [],
        somewhere: []
      };

      for (let i = 0; i < $scope.songList.files.length; i++) {
        let len = $scope.songList.files[i].split("/").length - 1
        let file = $scope.songList.files[i]
        let songArr = file.indexOf("No") > -1 ? songCategories.noLetters : songCategories.somewhere
        songArr.push({
          // title: arg.path + '/' + $scope.songList.files[i],
          // file: arg.path + '/' + $scope.songList.files[i],
          title: $scope.songList.files[i],
          file: $scope.songList.files[i],
          name: $scope.songList.files[i].split("/")[len],
          howl: null,
          index: i
        });
      }

      $scope.playersByCategory = {}
      Object.entries(songCategories).forEach(entry => {
        let categoryName = entry[0];
        let songsInCategory = entry[1];
        $scope.playersByCategory[categoryName] = new Player(songsInCategory, categoryName)
        if (!$scope.player) {
          // Default to first player
          $scope.player = $scope.playersByCategory[categoryName]
        }
      });
      $scope.songCategories = Object.keys(songCategories)

      $scope.musicSelected = true;
      $scope.$apply()
    }

    function tag(data) {
      new jsmediatags.Reader(data.file)
        .setTagsToRead(["title", "artist", "picture"])
        .read({
          onSuccess: function (tag) {
            if (tag.tags.title) {
              $scope.trackName = tag.tags.title;
              $scope.trackArtist = tag.tags.artist;
            }
            else {
              $scope.trackName = data.name;
              $scope.trackArtist = "";
            }
            var image = tag.tags.picture;
            if (image) {
              // var pic = document.getElementById('picture')
              var base64String = "";
              for (var i = 0; i < image.data.length; i++) {
                base64String += String.fromCharCode(image.data[i]);
              }
              var base64 = "data:image/jpeg;base64," + window.btoa(base64String);

              var img = document.getElementById('picture')
              img.style.display = "block";
              img.setAttribute('src', base64);
              img.addEventListener('load', function () {
                var vibrant = new Vibrant(img, 128, 3);
                var swatches = vibrant.swatches()

                if ($scope.theme == 'disco') {
                  document.body.style.backgroundColor = swatches['DarkMuted'].getHex()
                  document.body.style.color = swatches['LightVibrant'].getHex()
                }
              })
            } else {
              document.getElementById('picture').style.display = "none";
              // pic.style.backgroundImage = "none";                  
            }
          },
          onError: function (error) {
            console.log(':(', error.type, error.info);
          }
        });
    }

    $scope.seekToTime = function ($event) {
      $scope.player.seek($event.offsetX / sk.offsetWidth);
    }
    $scope.playPlaylistSong = function (index) {
      console.log(index)
      $scope.player.skipTo(index);
    }
    $scope.nextSong = function () {
      if ($scope.shuffle) {
        $scope.player.skip('random');
      }
      else {
        $scope.player.skip('next');
      }
      $scope.songPlaying = true;
    }
    $scope.prevSong = function () {
      if ($scope.shuffle) {
        $scope.player.skip('random');
      }
      else {
        $scope.player.skip('prev');
      }
      $scope.songPlaying = true;
    }

    $scope.showPlaylist = function () {
      if ($scope.playListVisible) {
        $scope.playListVisible = false;
        // console.log($scope.playListVisible)
      }
      else {
        $scope.playListVisible = true;
        // console.log($scope.playListVisible)
      }
    }

    $scope.clickCategory = function (category) {
      if (category !== $scope.player.category) {
        $scope.toggleMusicPlaying(false)
        $scope.player = $scope.playersByCategory[category]
        $scope.toggleMusicPlaying(true)
      } else {
        $scope.playMusic()
      }
    }

    $scope.toggleMusicPlaying = function (shouldPlay) {
      if (!shouldPlay) {
        $scope.songPlaying = false;
        $scope.player.pause();
      }
      else {
        $scope.songPlaying = true;
        $scope.player.play();
      }
    }

    $scope.playMusic = function () {
      $scope.toggleMusicPlaying(!$scope.songPlaying)
    }

    $scope.toggleShuffle = function () {
      if ($scope.shuffle) {
        $scope.shuffle = false;
      }
      else {
        $scope.shuffle = true;
      }
    }

    $scope.togglecheckbox = function () {
      if ($scope.mute) {
        $scope.mute = false;
        $scope.player.volume(slider.value / 100);
      }
      else {
        $scope.mute = true;
        $scope.player.volume(0);
      }
    }

    slider.oninput = function () {
      var val = slider.value / 100;
      $scope.player.volume(val);
      $scope.mute = false;
    }

    var Player = function (playlist, category) {
      this.playlist = playlist;
      this.index = 0;
    }

    Player.prototype = {

      play: function (index) {
        var self = this;
        var sound;

        index = typeof index === 'number' ? index : self.index;
        var data = self.playlist[index];
        $scope.trackName = data.name;
        $scope.trackArtist = "";
        // console.log(data);
        tag(data);

        if (data.howl) {
          sound = data.howl;
        } else {
          sound = data.howl = new Howl({
            src: [data.file],
            html5: true,
            onplay: function () {
              $scope.timer = self.formatTime(Math.round(sound.duration()));
              requestAnimationFrame(self.step.bind(self));
              $scope.$apply();
            },
            onend: function () {
              if ($scope.shuffle) {
                self.skip('random');
              }
              else {
                self.skip('right');
              }
            }
          });
        }

        sound.play();

        self.index = index;
      },

      pause: function () {
        var self = this;

        var sound = self.playlist[self.index].howl;

        sound.pause();
      },

      skip: function (direction) {
        var self = this;

        var index = 0;
        if (direction === 'prev') {
          index = self.index - 1;
          if (index < 0) {
            index = self.playlist.length - 1;
          }
        }
        else if (direction === 'random') {
          index = Math.floor(Math.random() * self.playlist.length) + 1;
          console.log(index);

        }
        else {
          index = self.index + 1;
          if (index >= self.playlist.length) {
            index = 0;
          }
        }

        var data = self.playlist[self.index];
        // console.log(data);
        tag(data);

        self.skipTo(index);
      },

      skipTo: function (index) {
        var self = this;

        if (self.playlist[self.index].howl) {
          // console.log(self.playlist[self.index].howl);
          self.playlist[self.index].howl.stop();
        }

        var data = self.playlist[index];
        // console.log(data);
        tag(data);

        if (!$scope.songPlaying) {
          $scope.songPlaying = true;
          self.play(index);
        }
        else
          self.play(index);
      },

      step: function () {
        var self = this;

        var sound = self.playlist[self.index].howl;

        var seek = sound.seek() || 0;
        timer.innerHTML = self.formatTime(Math.round(seek));
        progress.style.width = (((seek / sound.duration()) * 100) || 0) + '%';

        if (sound.playing()) {
          requestAnimationFrame(self.step.bind(self));
        }
      },
      formatTime: function (secs) {
        var minutes = Math.floor(secs / 60) || 0;
        var seconds = (secs - minutes * 60) || 0;

        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
      },
      volume: function (val) {
        var self = this;

        // Update the global volume (affecting all Howls).
        Howler.volume(val);

      },
      seek: function (time) {
        var self = this;

        var sound = self.playlist[self.index].howl;

        if (sound.playing() || true) {
          sound.seek(sound.duration() * time);
          requestAnimationFrame(self.step.bind(self));
        }
      }
    }
  }])

var express = require('express');
var router = express.Router();
var User = require('../models/user');

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("index");
  console.log(req.session.passport);
  var passport = req.session.passport;
  User.findOne({_id: req.session.passport.id}).exec(function(err, user) {
    if(!err) {
      if(!user) {//初めてログインした場合はユーザー情報を保存
        var user = new User({_id: passport.id, name: passport.screen_name});
        user.save(function(err) {
          if(!err) {
            res.render('index', {
              title: 'ユーザー登録を完了しました',
              session: req.session.passport
            });
          } else {
            res.render('error', {
              error: err,
              message: 'ユーザー登録エラー'
            });
          }
        });
      } else {
        res.render('index', {
          title: 'ユーザー登録済みです',
          session: req.session.passport
        });
      }
    } else {
      res.render('error', {
        error: err,
        message: 'ユーザー参照エラー'
      });
    }
  });
});

module.exports = router;
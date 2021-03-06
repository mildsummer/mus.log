var express = require('express');
var router = express.Router();
var User = require('../models/user');

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("index");
  var passport = req.session.passport;
  if(!passport) {
    res.render('login');
  }
  User.findOne({_id: passport.user.id}).exec(function(err, user) {
    if(!err) {
      if(!user) {//初めてログインした場合はユーザー情報を保存
        var newUser = new User({_id: passport.user.id, name: passport.user.displayName});
        req.session.user = newUser;
        newUser.save(function(err) {
          if(!err) {
            res.render('index', {
              title: 'ユーザー登録を完了しました',
              session: passport
            });
          } else {
            res.render('error', {
              error: err,
              message: 'ユーザー登録エラー'
            });
          }
        });
      } else {
        req.session.user = user;
        res.render('index', {
          title: passport.user.displayName + ' / mus.log',
          session: passport
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
var express = require('express');
var router = express.Router();
var request = require('request');
var Contribution = require('../models/contribution');
var User = require('../models/user');

/* POST contribute. */
router.post('/post', function(req, res) {
  console.log(req.body);
  request({
    url: req.body.url,
    encoding: null
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var base64prefix = 'data:' + response.headers['content-type'] + ';base64,';
      var image = body.toString('base64');
      var contribution = new Contribution({
        text: req.body.text,
        base64: (base64prefix + image),
        user: req.session.passport.user.id
      });
      contribution.save(function(err) {
        if(!err) {
          User.findOne({_id: req.session.passport.user.id}).exec(function(err, user) {
            user.contributions.push(contribution._id);
            user.save(function(err) {
              if(!err) {
                res.send(contribution);//投稿完了
              } else {
                res.send('データ書き込みエラー');
              }
            });
          });
        } else {
          res.send('投稿エラー');
        }
      });
    } else {
      console.log('error: '+ response.statusCode);
      res.send('URLエラー');
    }
  })
});

/* edit contribute. */
router.post('/edit', function(req, res) {
  console.log(req.body);
  Contribution.findOne({_id: req.body.contribution_id}).exec(function(err, contribution) {
    contribution.text = req.body.text;
    contribution.save(function(err) {
      if(!err) {
        res.send(contribution);//投稿完了
      } else {
        res.send('データ書き込みエラー');
      }
    });
  });
});

router.get('/all', function(req, res) {
  Contribution.find({user: req.session.passport.user.id}).exec(function(err, contributions) {
    if(!err) {
      res.send(contributions);
    } else {
      res.send('データ取得エラー');
    }
  });
});

module.exports = router;

window.run = {
    /*
    * @desc:获取xhr并发送数据;
    * @prarm:GET,POST,
    * @param:url,
    * @param:callback,
    * @param:sendData
    * */
    getXHR : function(method,url,callback,sendData) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                callback(xhr.responseText)
            };
        };
        xhr.send(sendData || "");
    },
    login : function(sendUrl, data, callback) {
        $.post( sendUrl ,data,function(response){
            callback(response);
        })
    },
    //通过chrome方法删除cookie，注销当前用户;
    removeCookie : function(url, name){
        chrome.cookies.remove({url:url,name:name});
    },
    logout : function() {
        //先获取所有对应youku域名的cookies;
        chrome.cookies.getAll({domain:"youku.com"},function(cookies){
            $.each(cookies,function(i, ck){
                var url = "http://www"+ck.domain;
                var name = ck.name;
                run.removeCookie(url, name);
                run.modalShow("目前注销成功");
            });
        });
        //就是删cookie呗;

    },
    _logout : function() {
        //先获取所有对应youku域名的cookies;
        run.log.prepend("删除上次用户登录信息....");
        chrome.cookies.getAll({domain:"youku.com"},function(cookies){
            $.each(cookies,function(i, ck){
                var url = "http://www"+ck.domain;
                var name = ck.name;
                run.removeCookie(url, name);
            });
        });
        //就是删cookie呗;

    },
    //artDialog的配置
    confirm : function(){
        /*
        artDialog.confirm = function (content, yes, no) {
            return artDialog({
                id: 'Confirm',
                icon: 'question',
                fixed: true,
                lock: true,
                opacity: .1,
                content: content,
                ok: function (here) {
                    return yes.call(this, here);
                },
                cancel: function (here) {
                    return no && no.call(this, here);
                }
            });
        };
        */
    },
    refreshCaptcha : function(){
        $("#captcha").attr("src","http://passport.youku.com/user/captcha/"+Math.random());
    },
    submit : function() {
        var users = $("#users");
        run.log = $(".dairy");

        //获取用户名和密码列表;
        var userArray = [];
        $.each(users.val().replace(/\s/g,"").split(","),function(i, user){
            try{
                var json = {};
                json.name = user.split("---")[0];
                json.password = user.split("---")[1];
                userArray.push(json);
                run.log.prepend( "初始化用户:" + JSON.stringify(json) );
            }catch(e) {
                alert("用户名密码格式不对");
            };
        });
        run.userArray = userArray;

        //注销用户， 刷新验证码， 登陆用户，回调函数是开始批量订阅账号, 回调直接;
        run.followMain(userArray);

    },
    followMain : function(){
        //注销默认的用户
        run._logout();
        var sendUrl = "http://passport.youku.com/user_loginSubmit";
        var user = run.userArray.shift();
        if(!user)return;
        //因为chrome删除cookie是异步的，所以要过一会儿刷新登录的验证码;
        setTimeout(function() {
            run.log.prepend("更新验证码....");
            run.refreshCaptcha();
        },100);
        art.dialog.prompt("请输入验证码",function(comfirmCode) {
            try{
                var submitStr = "user_name_login="+
                    encodeURIComponent(user.name)+"&passwd_login="+
                    encodeURIComponent(user.password) +
                    "&captcha_l="+
                    comfirmCode+"&forever=on&callback=login_submit_callback&"+
                    "from=v.youku.com%2Fv_show%2Fid_XNjgwNDI5NTcy.html@@undefined@@comment-1&wintype=pop";

                //验证码输入完毕的ajax数据发送, 有一个回调;
                run.login(sendUrl, submitStr,function(response) {
                    if(response.indexOf("parent.login_submit_callback\(1, \"\"\)\;") != -1) {
                        run.modalShow("目前已经登陆成功");
                        run.follow();
                    }else if(response.indexOf(98)){
                        run.modalShow("验证码错误");
                        //重新登陆;
                        run.followMain();
                    }else{
                        run.modalShow("登陆失败");
                        //重新登陆;
                        run.followMain();
                    };
                });
            }catch(e) {
                alert("数据错误")
            }
        });
    },
    follow : function() {
        var str = "http://i.youku.com/u/subToUpdates?follow={follow}&addtion=5_12&callback=jsoncallback1427247926667";
        var lists = $("#followlist").val().replace(/\s/g,"").split("---");
        var next = function(len) {
            //如果是最后一位要订阅的用户，我们就跳到下一个用户继续订阅;
            if( (lists.length-1) == len) {
                //最后在回调自己;
                run.followMain();
            }
        };
        var _timeout = 1000;

        $.each(lists,function(i, list) {
            var df = $.Deferred().done(function() {
                $.get(str.replace(/{follow}/i,list),function(res){
                    window.jsoncallback1427247926667();
                    next(i);
                });
            });
            run.util_timeout(function() {
                df.resolve();
            },_timeout);
        });

        window.jsoncallback1427247926667 = function() {
            run.log.prepend("订阅成功");
            _timeout += 100;
            $("#followResult").html( parseInt($("#followResult").text())+1 );
        };
    },
    modalShow : function(msg) {
        $('#msg').modal('show');
        $('#msg .modal-content p').html(msg);
        run.log.prepend( msg );
        var df = $.Deferred().done(function(){
            run.modalHide();
        });
        //自动隐藏窗口;
        setTimeout(function() {
            df.resolve();
        },500);
    },
    modalHide : function() {
        $('#msg').modal('hide');
    },
    util_timeout : function(fn,times) {
        window.setTimeout(function() {
            fn();
        },times);
    },
    //从本地存储保存获取初始化消息
    initData : function() {
        localStorage.usersList&&($("#users").val(localStorage.usersList));
        localStorage.followlist&&$("#followlist").val(localStorage.followlist);
    },
    store : function() {
        $("#users").bind("blur",function() {
            localStorage.usersList =  $("#users").val();
        });
        $("#followlist").bind("blur",function() {
            localStorage.followlist =  $("#followlist").val();
        });
    },
    preventDe : function() {
        document.oncontextmenu = function(ev) {
            ev.stopPropagation&&ev.stopPropagation();
            ev.preventDefault&&ev.preventDefault();
            return false;
        }
    },
    events : function() {
        $('#myTab a:last').tab('show');
        $("#reload").click(function(){
            location.reload();
        });
        $("#submit").click(run.submit);
        $("#logoff").click(run.logout);
        run.preventDe();
        //$("#follow").click(run.follow);
        run.store();
    }
};

$(function () {
    //定义artDialog的配置
    run.confirm();
    run.initData();
    //事件
    run.events();
})
var app = window.angular.module('chatmachine', ['firebase','ngAnimate','ngSanitize']);

app.run(function () {
	// Initialize Firebase
	var config = {
		apiKey: "AIzaSyBd1ez7cGwA7znEnltKauUoW5cGv5eC9s4",
		authDomain: "chatmachine-26f53.firebaseapp.com",
		databaseURL: "https://chatmachine-26f53.firebaseio.com",
		storageBucket: "chatmachine-26f53.appspot.com",
		messagingSenderId: "832988490463"
	};
	window.firebase.initializeApp(config);
});

app.factory("Auth", ["$firebaseAuth", function ($firebaseAuth) {
	return $firebaseAuth();
}]);

app.constant({
	BOSS : "ThLz4q2U0GTtCZfVNUfZjv92G703"
});

app.filter("authenticate", ['BOSS', 'Auth', 'filterFilter', function (boss, auth, filter) {
	return function (input) {
		var output = [];
		angular.forEach(input, function (chat,key) {
			if (chat.msgFromId === auth.$getAuth().uid || chat.msgTo === auth.$getAuth().uid) {
				output.push(chat);
			}
		});
		return output;
	}
}])

app.service("myDb", ["$firebaseArray", "$firebaseObject", function ($firebaseArray, $firebaseObject) {
	var db = firebase.database();
	return {
		getRef : function (name) {
			return db.ref(name);
		},
		getArray : function (nameOfTable) {
			if (typeof nameOfTable === 'string') {
				nameOfTable = this.getRef(nameOfTable);
			}
			return $firebaseArray(nameOfTable);
		},
		getObj : function (nameOfTable) {
			if (typeof nameOfTable === 'string') {
				nameOfTable = this.getRef(nameOfTable);
			}
			return $firebaseObject(nameOfTable);
		}
	};
}]);

app.controller('chatcontrol', ['Auth', '$scope', 'myDb', "BOSS", "$sanitize", function (auth, scope, myDb, boss, $sanitize) {

	//intialize
	scope.messages;
	scope.clientMsg = {
		content: ''
	};
	scope.messages__busy = true;
	scope.replyTo = boss;
	scope.boss = boss;
	//For enabling ascii emojis
	emojione.ascii = true;
	//Initialize the notification system
	if ('Notification' in window) {
	  notify();
	}

	// Any time auth state changes, add the user data to scope
    auth.$onAuthStateChanged(function(firebaseUser) {
		var banner = document.querySelector('.banner');
		scope.user = firebaseUser;
		if (firebaseUser) {
			//Logged In
			angular.element(banner).addClass('logged_in');
			scope.fetchChats();
		} else {
			//Logged Out
			angular.element(banner).removeClass('logged_in');
		}
    });
	
	scope.signOut = function () {
		auth.$signOut();
	};
	
	scope.login = function () {
		// login with Google
		auth.$signInWithPopup("google").then(function (firebaseUser) {
			scope.createIsTypingUser(firebaseUser);
		}, function(error) {
			console.error("Authentication failed:", error);
		});
	};
	
	scope.createIsTypingUser = function (firebaseUser) {
		scope.listOfUsers = myDb.getObj("users");
		scope.listOfUsers.$loaded(function () {
			if (!scope.listOfUsers[firebaseUser.user.uid]) {
				console.info('adding => ',firebaseUser.user.displayName);
				firebase.database().ref("users").child(firebaseUser.user.uid).set({
					displayName: firebaseUser.user.displayName,
					id: firebaseUser.user.uid,
					photoURL: firebaseUser.user.photoURL
				});
			}
		});
	};
	
	scope.fetchChats = function () {
		scope.messages = myDb.getArray("messages");
		scope.messages.$loaded(function (data) {
			//console.log(data);
			scope.messages__busy = false;
			setTimeout(function() {
				document.querySelector('.msgHolder').focus();
				document.querySelector('.messages').scrollTop = document.querySelector('.messages').scrollHeight;
			}, 100);
			document.querySelector('.msgHolder').addEventListener('keydown', function (e) {
				if (e.which === 13) {
					scope.sendChats();
				}
			});
			scope.messages.$watch(function (e) {
				if ('prevChild' in e && e.event === 'child_added') {
					var newMsg = scope.messages.$getRecord(e.key);
					if (newMsg.msgTo == scope.user.uid) {
						if ('Notification' in window) {
							notify('New Message from '+newMsg.msgFromName, {
								body: newMsg.msg,
								icon: 'assets/images/bots_family_for_bg.jpg',
								onclick: function (e) {
									window.focus();
								}
							});
						}
					}
					setTimeout(function() {
						document.querySelector('.messages').scrollTop = document.querySelector('.messages').scrollHeight;
					}, 100);
				}
			});
		});
	};

	scope.switchReplyTo = function (msgFromId) {
		scope.replyTo = msgFromId;
		document.querySelector('.msgHolder').focus();
	};

	scope.sendChats = function () {
		scope.clientMsg.content = $sanitize(scope.clientMsg.content);
		if (scope.clientMsg.content && scope.clientMsg.content.trim() != '') {
			scope.messages__busy = true;
			scope.messages.$add({
				msg: scope.clientMsg.content,
				msgFromId: scope.user.uid,
				msgFromName: scope.user.displayName,			
				msgTo: scope.replyTo,
				timeStamp: firebase.database.ServerValue.TIMESTAMP,
				fromBoss: scope.user.uid === boss
			}).then(function () {
				//scope.replyTo = boss;
				document.querySelector('.messages').scrollTop = document.querySelector('.messages').scrollHeight;
				scope.clientMsg.content = '';
				scope.messages__busy = false;
				setTimeout(function() {
					document.querySelector('.msgHolder').focus();
				}, 100);
			}, function () {
				console.error('Message could not be sent');
			});
		}
	};
	
	scope.render = function (input) {
		var renderedOutput = emojione.shortnameToImage(input);
		return renderedOutput;
	}
}]);

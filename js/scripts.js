window.module = {};
window.module.exports = {};

let host = location.host;
if (host === 'localhost' || host === 'localhost:8500') {
    document.write('<script src="js/dist/web-modules.js"></script>' +
        '<script src="node_modules/free-core/js/Blog.js"></script>' +
        '<script src="js/Photoalbum.js"></script>' +
        '<script src="js/Videoplaylist.js"></script>' +
        '<script src="js/StartNow.js"></script>' +
        '<script src="js/ImportButtons.js"></script>' +
        '<script src="js/Main.js"></script>' +
        '<script src="js/EnsUtility.js"></script>' +
        //'<script src="js/mru.js"></script>' +
        //'<script src="js/YoutubeImport.js"></script>' +
        '<script src="js/FacebookImport.js"></script>' +
        '<script src="js/VKImport.js"></script>' +
        '<script src="js/News.js"></script>' +
        '<script src="js/Messages.js"></script>' +
        '<script src="js/Wallet.js"></script>' +
        '<script src="js/Settings.js"></script>' +
        '<script src="js/Utils.js"></script>' +
        '<script src="js/Post.js"></script>' +
        '<script src="js/Instagram.js"></script>' +
        '<script src="js/GooglePlus.js"></script>' +
        '<script src="js/anal.js"></script>' +
        '<script src="js/initDev.js"></script>'
        //'<script src="js/youtube-load.js"></script>'
    );
} else {
    document.write('<script src="js/dist/web-full.js"></script>');
}
/*
 *prettyPhoto插件
 *
 * */
(function($){
    //定义一个命名空间
    $.prettyPhoto={};

    //定义jquery类方法
    $.fn.prettyPhoto = function(pp_settings) {
        //设置常用参数
        pp_settings=jQuery.extend({
            //存储图片地址的html属性
            hook: "rel",
            //图片切换速度
            animation_speed: "fast",
            //距离顶部的距离
            projectedTop: 50,
            //自动播放的速度
            slideshow: 5000,
            //页码显示的间隔字符
            counter_separator_label: '/',
            //是否自动播放
            autoplay_slideshow: false,
            //div中大图显示代码
            image_markup: '<img id="fullResImage" src="{path}" />',
            //主体内容代码
            markup: '<div class="pp_pic_holder"> \
                        <div class="ppt"></div> \
                        <div class="pp_content_container"> \
                          <div class="pp_content"> \
                                <div class="pp_loaderIcon"></div> \
                                <div class="pp_fade"> \
                                    <div class="pp_hoverContainer"> \
                                        <a class="pp_next" href="#">next</a> \
                                        <a class="pp_previous" href="#">previous</a> \
                                    </div> \
                                    <div id="pp_full_res"></div> \
                                    <div class="pp_description"></div> \
                                </div> \
                          </div> \
                        </div> \
                        <div class="pp_nav"> \
                            <a href="#" class="pp_nav_previous">Previous</a> \
                            <p class="currentTextHolder">0/0</p> \
                            <a href="#" class="pp_nav_next">Next</a> \
                        </div> \
                    </div> \
                    <div class="pp_overlay"></div>',
            //画廊缩略图代码
            gallery_markup: '<div class="pp_gallery"> \
                                <a href="#" class="pp_arrow_previous">Previous</a> \
                                <div> \
                                    <ul> \
                                        {gallery} \
                                    </ul> \
                                </div> \
                                <a href="#" class="pp_arrow_next">Next</a> \
                            </div>'
        },pp_settings)

        //声明全局变量
        var matchedObjects = this,
        //获得窗口高度和宽度
        windowHeight = $(window).height(), windowWidth = $(window).width();
        var pp_slideshow;
        var pp_dimensions;
        //确定遮罩层是否打开
        var pp_open;

        //绑定键盘事件
        $(document).unbind('keydown.prettyphoto').bind('keydown.prettyphoto',function(e){
            if(typeof $pp_pic_holder != 'undefined'){
                if($pp_pic_holder.is(':visible')){
                    switch(e.keyCode){
                        case 37:
                            $.prettyPhoto.changePage('previous');
                            e.preventDefault();
                            break;
                        case 39:
                            $.prettyPhoto.changePage('next');
                            e.preventDefault();
                            break;
                    };
                    // return false;
                };
            };
        });//bind key


        //初始化方法
        $.prettyPhoto.initialize=function(){
            settings=pp_settings;

            //判断是否有一系列图片
            theRel = $(this).attr(settings.hook);
            galleryRegExp = /\[(?:.*)\]/;

            //将所有图片(其实是获取超链接a)的href,alt,title存储到数组pp_images，pp_titles，pp_descriptions
            pp_images = jQuery.map(matchedObjects, function(n, i){ if($(n).attr(settings.hook).indexOf(theRel) != -1) return $(n).attr('href'); }) ;
            pp_titles = jQuery.map(matchedObjects, function(n, i){ if($(n).attr(settings.hook).indexOf(theRel) != -1) return ($(n).find('img').attr('alt')) ? $(n).find('img').attr('alt') : ""; });
            pp_descriptions =jQuery.map(matchedObjects, function(n, i){ if($(n).attr(settings.hook).indexOf(theRel) != -1) return ($(n).attr('title')) ? $(n).attr('title') : ""; });
            
            //获得当前图片在图片数组中的位置
            set_position = jQuery.inArray($(this).attr('href'), pp_images); // Define where in the array the clicked item is positionned
            
            //遮罩层和遮罩层容器
            _build_overlay(this);
            //主体
            $.prettyPhoto.open();

            return false;
        };

        //创建遮罩层容器$pp_pic_holder,遮罩层$pp_overlay
        function _build_overlay(caller){
            //在body中插入markup内容
            $('body').append(settings.markup);

            //遮罩层对象
            $pp_overlay=$('div.pp_overlay');
            //遮罩层容器
            $pp_pic_holder = $('.pp_pic_holder');
            //标题
            $ppt=$('.ppt');

            //插入画廊缩略图
            currentGalleryPage = 0;
            toInject = "";
            for (var i=0; i < pp_images.length; i++) {
                if(!pp_images[i].match(/\b(jpg|jpeg|png|gif)\b/gi)){
                    classname = 'default';
                    img_src = '';
                }else{
                    classname = '';
                    img_src = pp_images[i];
                }
                toInject += "<li class='"+classname+"'><a href='#'><img src='" + img_src + "' width='50' alt='' /></a></li>";
            };
            toInject = settings.gallery_markup.replace(/{gallery}/g,toInject);
            $pp_pic_holder.find('.pp_content_container').after(toInject);

            //定义画廊上一页/下一页事件
            $pp_gallery = $('.pp_pic_holder .pp_gallery'), $pp_gallery_li = $pp_gallery.find('li');
            $pp_pic_holder.find('.pp_arrow_next').click(function(){
                $.prettyPhoto.changeGalleryPage('next');
                $.prettyPhoto.stopSlideshow();
                return false;
            });
            $pp_pic_holder.find('.pp_arrow_previous').click(function(){
                $.prettyPhoto.changeGalleryPage('previous');
                $.prettyPhoto.stopSlideshow();
                return false;
            });
            itemWidth = 52+5; // 52 beign the thumb width, 5 being the right margin.
            $pp_gallery_li.each(function(i){
                $(this)
                    .find('a')
                    .click(function(){
                        $.prettyPhoto.changePage(i);
                        return false;
                    });
            });

            //播放/暂停按钮
            $pp_pic_holder.find('.pp_nav').prepend('<a href="#" class="pp_play">Play</a>');
            $pp_pic_holder.find('.pp_nav .pp_play').click(function(){
                $.prettyPhoto.startSlideshow();
                return false;
            });
            
            //遮罩层样式并绑定事件
            $pp_overlay
                .css({
                    'opacity':0,
                    'height':$(document).height(),
                    'width':$(window).width()
                })
                .bind('click',function(){
                    $.prettyPhoto.close();
                })
                .show()
                .fadeTo('fast',0.8)

            //给上一张/下一张绑定click事件
            $pp_pic_holder.find('.pp_previous,.pp_nav_previous').bind('click',function(){
                $.prettyPhoto.changePage('previous');
                $.prettyPhoto.stopSlideshow();
                return false;
            });
            $pp_pic_holder.find('.pp_next,.pp_nav_next').bind('click',function(){
                $.prettyPhoto.changePage('next');
                $.prettyPhoto.stopSlideshow();
                return false;
            });

        };

        //主体(需要做到只要set_position变化则内容变化)。显示遮罩层、图片、文字等信息
        $.prettyPhoto.open = function(event) {
            //显示载入中的icon
            $('.pp_loaderIcon').show();

            //遮罩层容器显示
            $pp_pic_holder.fadeIn(function(){
                //显示标题
                $ppt.html(unescape(pp_titles[set_position]));
                //显示描述
                $pp_pic_holder.find('.pp_description').show().html(unescape(pp_descriptions[set_position]));
                //显示当前图片在图片中处于第几张的信息
                // Display the current position
                $pp_pic_holder.find('.currentTextHolder').text((set_position+1) + settings.counter_separator_label + $(pp_images).size());

                //处理图片的插入位置
                $pp_pic_holder.find('#pp_full_res')[0].innerHTML = settings.image_markup.replace(/{path}/g,pp_images[set_position]);
                //用imgPreloader获得图片真实尺寸
                //注：不用imgPreloader直接使用_showContent也可以显示出图片
                imgPreloader = new Image();
                imgPreloader.onload = function(){
                    // Fit item to viewport
                    //pp_dimensions = _fitToViewport(imgPreloader.width,imgPreloader.height);
                    pp_dimensions = _fitToViewport(imgPreloader.width,imgPreloader.height);
                    //处理图片的大小等信息
                    _showContent();
                };

                imgPreloader.onerror = function(){
                    alert('Image cannot be loaded. Make sure the path is correct and image exist.');
                    $.prettyPhoto.close();
                };
            
                imgPreloader.src = pp_images[set_position];
            });         
        };

        //处理图片的大小等信息
        function _showContent(){
            $('.pp_loaderIcon').hide(); 

            //计算遮罩层的高度
            settings.projectedTop=50;
            containerTotalHeight=settings.projectedTop+pp_dimensions["containerHeight"]+titleHeight;
            //遮罩层高度
            $pp_overlay
                .css({
                    //$(document).height()
                    'height':containerTotalHeight
                })
            
            //遮罩层容器的位置
            $pp_pic_holder.animate({
                'top': settings.projectedTop,
                //居中显示
                'left': ((windowWidth/2) - (pp_dimensions['containerWidth']/2) < 0) ? 0 : (windowWidth/2) - (pp_dimensions['containerWidth']/2),
                width:pp_dimensions['containerWidth']
            },settings.animation_speed,function(){
                $pp_pic_holder.find('.pp_hoverContainer,#fullResImage')
                    .height(pp_containerHeight)
                    .width(pp_containerWidth);
                $pp_pic_holder.find('.pp_fade').fadeIn(settings.animation_speed);
                //自动播放
                if(settings.autoplay_slideshow && !pp_slideshow && !pp_open) $.prettyPhoto.startSlideshow();
                pp_open = true;
            });
            //画廊翻页的样式
            _insert_gallery();
        };

        //翻页画廊的样式
        function _insert_gallery(){
            //判断每页显示几张缩略图
            itemWidth = 52+5; // 52 beign the thumb width, 5 being the right margin.
            //itemsPerPage = Math.floor(pp_dimensions['containerWidth'] / itemWidth);
            itemsPerPage=2;
            //alert(itemsPerPage);
            totalPage = Math.ceil(pp_images.length / itemsPerPage) - 1;
            if(totalPage == 0){
                $pp_gallery.find('.pp_arrow_next,.pp_arrow_previous').hide();
            }else{
                $pp_gallery.find('.pp_arrow_next,.pp_arrow_previous').show();
            };
            //每页缩略图的宽度
            galleryWidth = itemsPerPage * itemWidth;
            //所有缩略图的宽度
            fullGalleryWidth = pp_images.length * itemWidth;
            // Set the proper width to the gallery items
            //$pp_gallery在_build_overlay中定义了
            $pp_gallery
                .css('margin-left',-(galleryWidth/2))
                .find('div:first').width(galleryWidth+5)
                .find('ul').width(fullGalleryWidth)
                .find('li.selected').removeClass('selected');
            goToPage = (Math.floor(set_position/itemsPerPage) < totalPage) ? Math.floor(set_position/itemsPerPage) : totalPage;
            $.prettyPhoto.changeGalleryPage(goToPage);
            $pp_gallery_li.filter(':eq('+set_position+')').addClass('selected');
        };

        //上一张/下一张事件
        $.prettyPhoto.changePage = function(direction){
            if(direction == 'previous') {
                set_position--;
                if (set_position < 0) set_position = $(pp_images).size()-1;
            }else if(direction == 'next'){
                set_position++;
                if(set_position > $(pp_images).size()-1) set_position = 0;
            }else{
                set_position=direction;
            };
            
            //隐藏图片和翻页div层
            _hideContent(function(){
                $.prettyPhoto.open();
            });
        };//$.prettyPhoto.changePage
        
        //隐藏图片和翻页div层
        function _hideContent(callback){
            // Fade out the current picture
            $pp_pic_holder.find('#pp_full_res object,#pp_full_res embed').css('visibility','hidden');
            $pp_pic_holder.find('.pp_fade').fadeOut(settings.animation_speed,function(){
                $('.pp_loaderIcon').show();
                callback();
            });
        };//function _hideContent

        //画廊的上一页/下一页
        $.prettyPhoto.changeGalleryPage = function(direction){
            if(direction=='next'){
                currentGalleryPage ++;
                if(currentGalleryPage > totalPage) currentGalleryPage = 0;
            }else if(direction=='previous'){
                currentGalleryPage --;
                if(currentGalleryPage < 0) currentGalleryPage = totalPage;
            }else{
                currentGalleryPage = direction;
            };
            
            slide_speed = (direction == 'next' || direction == 'previous') ? settings.animation_speed : 0;

            slide_to = currentGalleryPage * (itemsPerPage * itemWidth);

            $pp_gallery.find('ul').animate({left:-slide_to},slide_speed);
        };//$.prettyPhoto.changeGalleryPage

        //自动播放/暂停
        $.prettyPhoto.startSlideshow = function(){
            if(typeof pp_slideshow == 'undefined'){
                $pp_pic_holder.find('.pp_play').unbind('click').removeClass('pp_play').addClass('pp_pause').click(function(){
                    $.prettyPhoto.stopSlideshow();
                    return false;
                });
                pp_slideshow = setInterval($.prettyPhoto.startSlideshow,settings.slideshow);
            }else{
                $.prettyPhoto.changePage('next');
            };
        }//$.prettyPhoto.startSlideshow
        $.prettyPhoto.stopSlideshow = function(){
            $pp_pic_holder.find('.pp_pause').unbind('click').removeClass('pp_pause').addClass('pp_play').click(function(){
                $.prettyPhoto.startSlideshow();
                return false;
            });
            clearInterval(pp_slideshow);
            pp_slideshow=undefined;
        }//$.prettyPhoto.stopSlideshow
        
        //关闭遮罩层
        $.prettyPhoto.close=function(){
            $('.pp_loaderIcon').hide();
            $.prettyPhoto.stopSlideshow();

            $('div.pp_pic_holder,div.ppt').fadeOut(settings.animation_speed,function(){ $(this).remove(); });

            $pp_overlay.fadeOut(settings.animation_speed,function(){
                $(this).remove();
                pp_open = false;
            });
        };

        //获得图片等内容显示的最佳尺寸
        function _fitToViewport(width,height){

            _getDimensions(width,height);
            
            // Define them in case there's no resize needed
            imageWidth = width, imageHeight = height;
            return {
                width:Math.floor(imageWidth),
                height:Math.floor(imageHeight),
                containerHeight:Math.floor(pp_containerHeight),
                containerWidth:Math.floor(pp_containerWidth),
                contentHeight:Math.floor(pp_contentHeight),
                contentWidth:Math.floor(pp_contentWidth),
            };
        };//function _fitToViewport

        //获得标题、描述等的真实尺寸(传入的是图片的宽度和高度)
        function _getDimensions(width,height){
            width = parseFloat(width);
            height = parseFloat(height);

            // Get the details height, to do so, I need to clone it since it's invisible
            $pp_description=$pp_pic_holder.find('.pp_description');
            $pp_description.width=(width);
            descriptionHeight=parseFloat($pp_description.css('marginTop')) + parseFloat($pp_description.css('marginBottom'));
            $pp_description = $pp_description.clone().addClass(settings.theme).width(width).appendTo($('body')).css({
                'position':'absolute',
                'top':-10000
            });
            descriptionHeight+=$pp_description.height();
            $pp_description.remove();
            
            // Get the titles height, to do so, I need to clone it since it's invisible
            $pp_title = $pp_pic_holder.find('.ppt');
            $pp_title.width(width);
            titleHeight = parseFloat($pp_title.css('marginTop')) + parseFloat($pp_title.css('marginBottom'));
            $pp_title = $pp_title.clone().appendTo($('body')).css({
                'position':'absolute',
                'top':-10000
            });
            titleHeight += $pp_title.height();
            $pp_title.remove();
            
            // Get the container size
            pp_contentHeight = height;
            pp_contentWidth = width;
            pp_containerHeight = pp_contentHeight;
            pp_containerWidth = width;

        }//function _getDimensions
        



        //绑定单击事件
        this.unbind('click.prettyphoto').bind('click.prettyphoto',$.prettyPhoto.initialize);
    };//$.fn.prettyPhoto

})(jQuery);

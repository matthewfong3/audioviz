// Put it all in an IIFE (immediately invoked function expression)
// ref: https://developer.mozilla.org/en-US/docs/Glossary/IIFE
(() => {
    "use strict"; // don't forget 'use strict'
    
    // variables
    let NUM_SAMPLES = 256;  
    let audioElement;
    let analyzerNode;
    let canvas, ctx;
    let data; // data array to store frequency/waveform data
    let imageObj = new Image(); // variable to load image icon
    let imageBgd = new Image(); // variable to load background image
    let delayAmount = 0.0;
    let delayNode;
    let biquadAmount = 0.0;
    let biquadNode;
    
    let particles, numParticles; // variables to create particles
    // Particle Object
    // Particle System Tutorial: http://www.howtosolutions.net/2016/09/javascript-canvas-simple-particle-system/
    let Particle = function(){
        this.x = Math.random() * ((centerX + 40) - (centerX - 40)) + (centerX - 40);
        this.y = Math.random() * ((centerY + 40) - (centerY - 40)) + (centerY - 40);
        this.velX = 4 * Math.random() - 2;
        this.velY = 4 * Math.random() - 2;
        this.r = Math.random() * (3 - 1) + 1;
        this.a = Math.random() * (1 - 0.2) + 0.2;
        this.Color = makeColor(255, 255, 255, this.a);
        
        Particle.prototype.Draw = function(ctx){
            ctx.fillStyle = this.Color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, false);
            ctx.closePath();
            ctx.fill();
        }
        
        Particle.prototype.Update = function(){
            this.x += this.velX;
            this.y += this.velY;
            if (this.x< 0 || this.x > canvas.width) this.x = Math.random() * ((centerX + 40) - (centerX - 40)) + (centerX - 40);

            if (this.y < 0 || this.y > canvas.height) this.y = Math.random() * ((centerY + 40) - (centerY - 40)) + (centerY - 40);
        }
    };
    
    // CONSTANTS for drawing shapes
    let barSpacing = 4;
    let barHeightDivider = 5;
    let frameCount = 0;
    
    // MISC. variables
    let centerX, centerY; // save the center X, Y of canvas in variables
    let sec, min;
    let songFile = "";
    
    // bool/state variables
    let showWaveForm, freqBarsEffect, paused; // paused bool checks pause and play state to animate particles
    let centerEffectState = "effect1", randColors = false, horizEffect = true, versionState = "simple", grayscale = false, threshold = false, invert = false;
    
    /* Initializes all necessary variables and function calls */
    function init(){
        // set up canvas 
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');
        imageObj.src = "images/me.png"; // load image icon
        //imageBgd.src = "images/wallpaper2.png"; /* Source: https://s-media-cache-ak0.pinimg.com/originals/5d/6c/31/5d6c3144809459f595aabef653bdedb8.jpg */
        // set up CONSTANTS
        centerX = canvas.width/2;
        centerY = canvas.height/2;
        
        // create particles array, number of particles and instantiate them into array
        particles = [];
        numParticles = 150;
        for(let i = 0; i < numParticles; i++) particles.push(new Particle());
        
        // get reference to <audio> element on page
        audioElement = document.querySelector('audio');

        // get the analyzer node with with helper function
        analyzerNode = createWebAudioContextWithAnalyzerNode(audioElement);
        
        // get sound track <select> and set up UI
        setupUI();
        
        // load and play default sound into audio element
        playStream(audioElement, "media/Senbonzakura.mp3");
        
        // start animation loop
        update();
    }
    
    /* Update method called each frame
       Clears and draws to the canvas */
    function update(){
        // schedule a call to the update() method in 1/60 seconds
        requestAnimationFrame(update);
        
        // create a new array of 8-bit integers (0-255)
        data = new Uint8Array(NUM_SAMPLES/2);
        
        // populate the array with the frequency data or waveform data
        // these arrays can be passed "by reference"
        if(showWaveForm) analyzerNode.getByteTimeDomainData(data); // waveform data
        else analyzerNode.getByteFrequencyData(data); 
        
        // DRAW!
        ctx.clearRect(0, 0, 1024, 576);
        if(versionState == "real") {
            imageBgd.src = "images/wallpaper2.png";
        }
        else if(versionState == "simple") {
            imageBgd.src = "images/wallpaper.png";
            //ctx.fillStyle = 'black';
            //ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(imageBgd, 0, 0);
        
        for(let i = 0; i < data.length; i++){
            if(versionState == "real"){
                // draw 'horizon' in center
                if(horizEffect && frameCount % 2 == 0) drawHorizonCircle(i);
               
                // draw lines in middle
                drawLines(i, barSpacing, barHeightDivider);
                
                // draw bezier curves, surrounding lines, or expanding lines from image icon
                drawCenterEffect(i, centerEffectState);
                
                // draw bars on bottom
                if(freqBarsEffect) drawFreqBars(i, barSpacing, barHeightDivider);
            }
            else if(versionState == "simple") drawBarsSIMPLE(i, barSpacing, barHeightDivider);
        }
        
        if(versionState == "real"){
            // draw and update the particles
            for(let j = 0; j < particles.length; j++){
                if(!paused) particles[j].Update();
                particles[j].Draw(ctx);
            }
            drawImageIcon(); // draw image icon on center of screen
        }
        
        frameCount++;
        displaySongInfo(); // display currently playing song in canvas
        manipulatePixels(); // manipulate pixels according to selected effects
        delayNode.delayTime.value = delayAmount; // change the value of the delay audio node after it's been created
        biquadNode.gain.value = biquadAmount; // change the value of the biquad audio node after it's been created
    }
    
    // Helper Functions: Drawing Shapes
    /* Draws audio bars in "simple" version of the visualizer */
    function drawBarsSIMPLE(i, barSpacing, barHeightDivider){
        let rectWidth = 4;
        let offsetY = 3;
        ctx.save();
        ctx.shadowColor = 'orange';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 60;
        ctx.fillStyle = 'white';
        ctx.fillRect(i * (barSpacing), canvas.height * .85, rectWidth, data[i]/barHeightDivider + offsetY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.strokeRect(i * (barSpacing), canvas.height * .85, rectWidth, data[i]/barHeightDivider + offsetY);
        ctx.restore();
    }
    
    /* Draws gradient lines in the center of screen */
    function drawLines(i, barSpacing, barHeightDivider){
        ctx.lineCap = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = makeGradient();
        ctx.beginPath();
        for(let j = 0; j < 4; j++){
            if(j == 0) {
                ctx.moveTo((i * (barSpacing)), centerY);
                ctx.lineTo((i * (barSpacing)), (centerY - data[i]/barHeightDivider));    
            }
            if(j == 1) {
                ctx.moveTo((i * (barSpacing)), centerY);
                ctx.lineTo((i * (barSpacing)), (centerY + data[i]/barHeightDivider));
            }
            if(j == 2){
                ctx.moveTo(canvas.width - (i * (barSpacing)), centerY);
                ctx.lineTo(canvas.width - (i * (barSpacing)), (centerY - data[i]/barHeightDivider));
            }
            if(j == 3){
                ctx.moveTo(canvas.width - (i * (barSpacing)), centerY);
                ctx.lineTo(canvas.width - (i * (barSpacing)), (centerY + data[i]/barHeightDivider));
            }
        }
        ctx.stroke();
    }
    
    /* Draws gradient bars on bottom of screen */
    function drawFreqBars(i, barSpacing, barHeightDivider){
        let rectWidth = 3;
        let offsetY = 10;
        ctx.fillStyle = makeGradient();
        ctx.fillRect(i * (barSpacing), canvas.height, rectWidth, -(data[i]/barHeightDivider) - offsetY);
        ctx.fillRect(canvas.width - (i * (barSpacing)), canvas.height, rectWidth, -(data[i]/barHeightDivider) - offsetY);
    }
    
    /* Draws horizon effect in middle of screen */
    function drawHorizonCircle(i){
        let percent = data[i]/255;
        let radius = percent * 120;
        ctx.fillStyle = makeColor(255, 255, 255, .05 - percent/10);
        // draw "horizon"
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(10, .25);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
        ctx.restore();
        ctx.fill();
        // draw circle in center
        ctx.fillStyle = makeColor(255, 255, 255, .1 - percent/10);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
        ctx.fill();
    }
    
    /* Draws bezier curves, green expanding lines, or expanding "spikes" from image icon */
    function drawCenterEffect(i, CEstate){
        let x, y, x2, y2, x3, y3, r, angTheta;
        ctx.lineWidth = 2;
        if(CEstate == "effect1"){ // bezier effect
            let ctrlX, ctrlY;
            let freqData = data[i]/50;
            
            if(randColors)ctx.fillStyle = getRandomColor(.9);
            else ctx.fillStyle = "white";
            
            ctx.beginPath();
            for(let j = 0; j < 4; j++){
                if(j == 0){
                    ctrlX = centerX - 30 * freqData;
                    ctrlY = centerY - 20 * freqData;
                }
                if(j == 1){
                    ctrlX = centerX + 30 * freqData;
                    ctrlY = centerY - 20 * freqData;
                }
                if(j == 2){
                    ctrlX = centerX - 25 * freqData;
                    ctrlY = centerY + 20 * freqData;
                }
                if(j == 3){
                    ctrlX = centerX + 25 * freqData;
                    ctrlY = centerY + 20 * freqData;
                }
                ctx.moveTo(centerX, centerY - 50);
                ctx.quadraticCurveTo(ctrlX, ctrlY, centerX, centerY + 50);
            }
            ctx.fill();
        }
        else if(CEstate == "effect2"){ // surrounding lines effect
            r = 72;
            angTheta = (5 * Math.PI * i / (3 * data.length)) + 2/3 * Math.PI; 
            ctx.strokeStyle = 'green'; 
            ctx.beginPath();
            for(let j = 0; j < 4; j++)
            {
                if(j == 0){
                    x = centerX + r * Math.cos(angTheta);
                    y = centerY - r * Math.sin(angTheta);
                    x2  =  centerX + (r + data[i]/15) * Math.cos(angTheta);
                    y2  =  centerY - (r + data[i]/15) * Math.sin(angTheta);
                }
                if(j == 1){
                    x = centerX + r * Math.cos(angTheta);
                    y = centerY - r * Math.sin(angTheta);
                    x2  =  centerX + (r - data[i]/15) * Math.cos(angTheta);
                    y2  =  centerY - (r - data[i]/15) * Math.sin(angTheta); 
                }
                if(j == 2){
                    x = centerX - r * Math.cos(angTheta);
                    y = centerY - r * Math.sin(angTheta);
                    x2  =  centerX - (r + data[i]/15) * Math.cos(angTheta);
                    y2  =  centerY - (r + data[i]/15) * Math.sin(angTheta); 
                }
                if(j == 3){
                    x = centerX - r * Math.cos(angTheta);
                    y = centerY - r * Math.sin(angTheta);
                    x2  =  centerX - (r - data[i]/15) * Math.cos(angTheta);
                    y2  =  centerY - (r - data[i]/15) * Math.sin(angTheta);  
                }
                ctx.moveTo(x, y);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        }
        else if(CEstate == "effect3"){ // expanding lines effect
            r = 50;
            angTheta = (13/9 * Math.PI * i/ data.length) + Math.PI/3;
            ctx.strokeStyle = "black";
            ctx.beginPath();
            for(let j = 0; j < 2; j++){
                if(j == 0){
                    x = centerX + r * Math.cos(angTheta);
                    y = centerY - r * Math.sin(angTheta);
                    x2 = centerX + (r + data[i]/10) * Math.cos(angTheta);
                    y2 = centerY - (r + data[i]/10) * Math.sin(angTheta); 
                }
                if(j == 1){
                    x = centerX - r * Math.cos(angTheta);
                    y = centerY + r * Math.sin(angTheta);
                    x2 = centerX - (r + data[i]/10) * Math.cos(angTheta);
                    y2 = centerY + (r + data[i]/10) * Math.sin(angTheta);
                }
                ctx.moveTo(x, y);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        }
    }
    
    /* Draws image icon at center of screen */
    function drawImageIcon(){
        ctx.drawImage(imageObj, centerX - 50, centerY - 50); // draw image icon of me
        
        // draw white border around image icon
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.strokeStyle = makeColor(255, 255, 255, 1);
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    // Helper Functions: Setting Up Functionality
    /* Creates the audioCtx, sourceNode and delayNode */
    function createWebAudioContextWithAnalyzerNode(audioElement){
        let audioCtx, analyzerNode, sourceNode;
        
        // create new AudioContext
        audioCtx = new (window.AudioContext || window.webkitAudioContext);
        
        // create an analyzer node
        analyzerNode = audioCtx.createAnalyser();
        
        // fft stands for Fast Fourier Transform
        analyzerNode.fftSize = NUM_SAMPLES;
        
        // create delayNode instance
        delayNode = audioCtx.createDelay();
        delayNode.delayTime.value = delayAmount;
        
        // create biquadNode instance
        biquadNode = audioCtx.createBiquadFilter();
        biquadNode.type = "lowshelf";
        biquadNode.frequency.value = 75;
        biquadNode.gain.value = biquadAmount;
        
        // hook up <audio> element to the analyzerNode
        sourceNode = audioCtx.createMediaElementSource(audioElement);
        
        // connect source node directly to speakers so we can hear the ulaltered source in this channel
        sourceNode.connect(audioCtx.destination);
        
        // this channel will play and visualize the delay
        sourceNode.connect(delayNode);
        delayNode.connect(analyzerNode);
        sourceNode.connect(biquadNode);
        biquadNode.connect(analyzerNode);
        
        // Explanation: the destination (speakers) will play both channels simultaneously if we didn't connect both channels to the destination, we wouldn't be able to hear the delay effect
        
        // connect to the destination (speakers)
        analyzerNode.connect(audioCtx.destination);
        return analyzerNode;
    }
    
    /* Reads the audio path and plays song files */
    function playStream(aE, path){
        aE.volume = 0.02;
        aE.play();
        
        if(path == "media/Odysee.mp3") songFile = "Odysee";
        else if(path == "media/BinarySuns.mp3") songFile = "Binary Suns (Coyote Kisses Remix)";
        else if(path == "media/DontLetMeDown.mp3") songFile = "Don't Let Me Down (Illenium Remix)";
        else if(path == "media/FadedRestrung.mp3") songFile = "Faded (Restrung)";
        else if(path == "media/Monody.mp3") songFile = "Monody (ft. Laura Brehm)";
        else if(path == "media/NeverForgetYou.mp3") songFile = "Never Forget You (Price & Takis Remix)";
        else if(path == "media/NOLA.mp3") songFile = "NOLA";
        else if(path == "media/Senbonzakura.mp3") songFile = "Senbonzakura";
        document.querySelector("#status").innerHTML = "Now playing: " + songFile;
    }
    
    /* Gets image data from canvas, manipulates pixels, and displays the image data back onto the canvas
       Reference: https://www.html5rocks.com/en/tutorials/canvas/imagefilters/ */
    function manipulatePixels(){
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        let data = imageData.data;
        let red, green, blue, result;
        
        // data[i] is red value
        // data[i+1] is green value
        // data[i+2] is blue value
        // data[i+3] is alpha value
        for(let i = 0; i < data.length; i+= 4){
            if(grayscale){
                red = data[i], green = data[i+1], blue = data[i+2];
                result = 0.1*red + 0.7*green + 0.2*blue;
                data[i] = data[i+1] = data[i+2] = result;
            }
            if(threshold){
                red = data[i], green = data[i+1], blue = data[i+2];
                result = (0.1*red + 0.7*green + 0.2*blue >= 128) ? 255 : 0;
                data[i] = data[i+1] = data[i+2] = result;
            }
            if(invert){
                red = data[i], green = data[i+1], blue = data[i+2];
                data[i] = 255 - red; // set red value
                data[i+1] = 255 - green; // set green value
                data[i+2] = 255 - blue; // set blue value
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
    
    /* Displays currently playing song and song duration */
    function displaySongInfo(){
        // display Song Name
        ctx.font = 'bold 16pt Maven Pro';
        ctx.fillStyle = "white";
        ctx.save();
        ctx.shadowColor = "orange";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 30;
        ctx.fillText(songFile, 10, canvas.height * .8);
        
        // display Time
        ctx.font = 'bold 10pt Maven Pro';
        let cT = Math.floor(audioElement.currentTime);
        if(cT < 60) { // for the first 60 seconds, set sec = cT & min = 0
            sec = cT;
            min = 0;
        }
        else{ // afterwards, reset sec and increment through modulo operator
            sec = 0;
            sec += cT % 60;
        }
        
        if(cT % 60 == 0 && cT != 0) min = cT/60; // for every 60 seconds, increment min based on currenTime
        
        if(sec < 10) ctx.fillText("0" + min + ":0" + sec, 10, canvas.height * .835);
        else ctx.fillText("0" + min + ":" + sec, 10, canvas.height * .835);
        ctx.restore();
    }
    
    /* Sets up each UI functionality */
    function setupUI(){
        document.querySelector("#trackSelect").onchange = function(e){
            playStream(audioElement, e.target.value); 
        };
        
        document.querySelector("#fsbutton").onclick = function(e){
            requestFullscreen(canvas);  
        };
        
        document.getElementById('centEffect').onchange = function(e){
            centerEffectState = e.target.value; 
        };
        
        document.getElementById("checkboxColors").onchange = function(e){
            randColors = e.target.checked;
        };
        
        document.getElementById("checkboxFreqBar").onchange = function(e){
            freqBarsEffect = e.target.checked;
        };
        
        document.querySelector("#checkboxHoriz").onchange = function(e){
            horizEffect = e.target.checked;
        };
        
        document.querySelector("#checkboxWaveform").onchange = function(e){
            showWaveForm = e.target.checked;
        };
        
        document.getElementById('versions').onchange = function(e){
            versionState = e.target.value;
        };
        
        document.getElementById('sliderReverb').onchange = function(e){
            delayAmount = e.target.value;
            document.getElementById('reverbResult').innerHTML = e.target.value;
        };
        
        document.getElementById('sliderBass').onchange = function(e){
            biquadAmount = e.target.value;
            document.getElementById('bassResult').innerHTML = e.target.value;
        };
        
        document.getElementById('checkboxGrayscale').onchange = function(e){
            grayscale = e.target.checked;    
        };
        
        document.getElementById('checkboxThreshold').onchange = function(e){
            threshold = e.target.checked;
        };
        
        document.getElementById('checkboxInvert').onchange = function(e){
            invert = e.target.checked;  
        };
        
        // play and pauses the particle effect
        audioElement.onplay = function(){
            paused = false;
        };
        
        audioElement.onpause = function(){
            paused = true;
        };
    }
    
    /* Allows the user to view in fullscreen */
    function requestFullscreen(element){
        if(element.requestFullscreen){
            element.requestFullscreen();
        }  else if(element.mozRequestFullscreen){
            element.mozRequestFullscreen();
        } else if(element.mozRequestFullScreen){
            // camel-cased 'S' was changes to 's' in spec
            element.mozRequestFullScreen();
        } else if(element.webkitRequestFullscreen){
            element.webkitRequestFullscreen();
        }
        // .. and do nothing if the method is not supported
    };
    
    // Helper Functions: Setting Colors
    /* Specify custom colors */
    function makeColor(red, green, blue, alpha){
        let color = 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';
        return color;
    }
    
    /* Apply a gradient effect */
    function makeGradient(){
        let grad = ctx.createLinearGradient(0, centerY, canvas.width, centerY);
        grad.addColorStop(0, "red");
        grad.addColorStop(0.33, "yellow");
        grad.addColorStop(0.67, "green");
        grad.addColorStop(1, "blue");
        return grad;
    }
    
    /* Or Get random colors */
    function getRandomColor(a){
        let red = Math.round(Math.random()*254+1);
        let green = Math.round(Math.random()*254+1);
        let blue=Math.round(Math.random()*254+1);
        let color='rgba('+red+','+green+','+blue+','+a+')';
        return color;
    }
    
    window.onload = init; // or window.addEventListener("load",init);
})();
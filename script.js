window.onload = function() {
            // Get DOM elements
            const videoElement = document.getElementById('video-feed');
            const canvasElement = document.getElementById('game-canvas');
            const ctx = canvasElement.getContext('2d');
            const overlay = document.getElementById('overlay');
            const messageText = document.getElementById('message-text');
            const startButton = document.getElementById('start-button');
            const scoreValue = document.getElementById('score-value');
            const gameContainer = document.querySelector('.game-container');
            const videoContainer = document.querySelector('.video-container');

            // Game variables
            let paddleX = 0;
            let ballX = 0;
            let ballY = 0;
            let ballSpeedX = 5;
            let ballSpeedY = 5;
            let score = 0;
            let gameRunning = false;
            let gameInitialized = false;

            // Camera dimensions
            const cameraWidth = 640;
            const cameraHeight = 480;

            // MediaPipe Hands setup
            const hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
                }
            });

            // Hand tracking configuration
            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults(onResults);

            // Function to handle MediaPipe results
            function onResults(results) {
                // If the game is running, update the paddle position based on hand landmarks
                if (gameRunning && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    const landmarks = results.multiHandLandmarks[0];
                    // Map the hand position from the video feed to the canvas
                    // The video feed is mirrored via CSS, so the hand movement is intuitive.
                    // We need to scale the x-coordinate from the video resolution to the canvas width.
                    // The video's natural dimensions are what MediaPipe reports.
                    const videoWidth = videoElement.videoWidth;
                    const videoHeight = videoElement.videoHeight;
                    const normalizedX = landmarks[0].x;
                    
                    // The video feed is already mirrored via CSS, so we don't need to do `1 - x`.
                    // The `landmarks[0].x` value is already a normalized value (0.0 to 1.0)
                    // We map this to the canvas width.
                    paddleX = normalizedX * canvasElement.width;
                }
            }

            // Function to draw the game elements on the canvas
            function draw() {
                // Clear the canvas
                ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
                ctx.fillStyle = '#1a202c';
                ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

                // Draw the paddle
                ctx.fillStyle = '#48bb78';
                const paddleWidth = canvasElement.width * 0.2;
                const paddleHeight = 20;
                const paddleY = canvasElement.height - 30;
                ctx.fillRect(paddleX - paddleWidth / 2, paddleY, paddleWidth, paddleHeight);
                ctx.shadowColor = '#48bb78';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.fillStyle = '#48bb78';
                ctx.fillRect(paddleX - paddleWidth / 2, paddleY, paddleWidth, paddleHeight);
                ctx.shadowColor = 'transparent';

                // Draw the ball
                ctx.beginPath();
                ctx.arc(ballX, ballY, 15, 0, Math.PI * 2);
                ctx.fillStyle = '#63b3ed';
                ctx.shadowColor = '#63b3ed';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.fill();
                ctx.shadowColor = 'transparent';
                ctx.closePath();
            }

            // Function to update the game state
            function update() {
                if (!gameRunning) return;

                // Update ball position
                ballX += ballSpeedX;
                ballY += ballSpeedY;

                // Wall collision detection
                if (ballX + 15 > canvasElement.width || ballX - 15 < 0) {
                    ballSpeedX = -ballSpeedX;
                }
                if (ballY - 15 < 0) {
                    ballSpeedY = -ballSpeedY;
                }

                // Paddle collision detection
                const paddleWidth = canvasElement.width * 0.2;
                const paddleHeight = 20;
                const paddleY = canvasElement.height - 30;

                if (ballY + 15 > paddleY &&
                    ballX > paddleX - paddleWidth / 2 &&
                    ballX < paddleX + paddleWidth / 2) {
                    ballSpeedY = -ballSpeedY;
                    score++;
                    scoreValue.textContent = score;
                }

                // Game over condition (ball goes past the paddle)
                if (ballY + 15 > canvasElement.height) {
                    endGame();
                }
            }

            // Main game loop
            function gameLoop() {
                update();
                draw();
                if (gameRunning) {
                    requestAnimationFrame(gameLoop);
                }
            }

            // Function to start the game
            function startGame() {
                score = 0;
                scoreValue.textContent = score;
                ballX = canvasElement.width / 2;
                ballY = 50;
                ballSpeedX = 5;
                ballSpeedY = 5;
                gameRunning = true;
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
                gameLoop();
            }

            // Function to end the game
            function endGame() {
                gameRunning = false;
                messageText.innerHTML = `<span class="text-4xl font-bold text-red-400">Game Over!</span><br>Your final score is <span class="text-green-400 font-bold">${score}</span>.`;
                startButton.textContent = 'Play Again';
                overlay.style.opacity = '1';
                overlay.style.pointerEvents = 'auto';
            }

            // Initialize the camera and start the video feed
            async function initializeCamera() {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: cameraWidth, height: cameraHeight } });
                    videoElement.srcObject = stream;
                    await new Promise((resolve) => {
                        videoElement.onloadedmetadata = () => {
                            resolve(videoElement);
                        };
                    });
                    videoElement.play();
                    gameInitialized = true;
                    messageText.textContent = "Place your hand in view to control the paddle.";
                    startButton.classList.remove('hidden');
                    processVideo();
                } catch (error) {
                    // Custom message box for errors, replacing `alert()`
                    messageText.textContent = "Error: Could not access webcam. Please ensure it's connected and you have granted permission.";
                    startButton.classList.add('hidden');
                    console.error('Could not access webcam:', error);
                }
            }

            // Start the MediaPipe video processing loop
            async function processVideo() {
                await hands.send({ image: videoElement });
                if (gameInitialized) {
                    requestAnimationFrame(processVideo);
                } else {
                    setTimeout(processVideo, 100);
                }
            }

            // Event listeners
            startButton.addEventListener('click', () => {
                startGame();
            });

            // Resize event listener to make the canvas responsive
            window.addEventListener('resize', () => {
                canvasElement.width = gameContainer.offsetWidth;
                canvasElement.height = gameContainer.offsetHeight;
                // Re-center the ball and paddle on resize
                ballX = canvasElement.width / 2;
                ballY = 50;
                paddleX = canvasElement.width / 2;
            });

            // Initial resize to set canvas size
            window.dispatchEvent(new Event('resize'));

            // Initial setup
            initializeCamera();
        };

/*global chrome: false */

const version = 1.3;
const windowProps = {'outerBounds': {'width': 1280, 'height': 800}};
const bodyText = `
	<br>
	Drop Images Here<br>
	<br>
	[<-] / [->]: prev / next<br>
	[+] / [-]: faster / slower<br>
	[r]: randomize<br>
	[F11]: fullscreen<br>
`;
const styles = {
	body: `
		height: 100%;
		margin: 0;
		text-align: center;
		vertical-align: middle;
		color: grey;
		font: bold 1.5em Arial;
		background: #000;
	`,
	image: `
		position: absolute;
		width: 100%; height: 100%;
		background: center/contain no-repeat;
		transition: opacity 1000ms ease-in-out;
	`,
	info: `
		position: absolute;
		width: auto;
		margin: 1em;
		padding: 0 2em;
		font: bold 1.5em Arial;
		right: 0; bottom: 0;
		color: rgba(255, 255, 255, 1);
		border: 4px solid rgba(255, 255, 255, 0.5);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.5);
		opacity: 0.8;
		transition: opacity 1000ms ease-in;
		line-height: 3em;
	`,
};

const shuffleFisherYates = (array) => {
  var m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
};

const cancelEvent = (e) => {
	e.stopPropagation();
	e.preventDefault();
};

const emptyDomElem = (elem) => {
	while(elem.firstChild) elem.removeChild(elem.firstChild);
};

class Slideshow {
	constructor(domElement, url) {
		this.domElement = domElement;
		this.url = url;
		this.slideDelay = 10000;
		this.infoFadeDuration = 700;
		this.currImg = document.createElement('div');
		this.nextImg = document.createElement('div');
		this.timeoutId = undefined;
		this.currIdx = -1;
		this.imageUrls = [];
		this.showTime = -1;
		this.delayChangeFactor = 1.2;
		domElement.style.cssText = styles.body;
		domElement.innerHTML = bodyText;
	}
	showInfo(text) {
		const {domElement} = this;
		const info = document.createElement('div');
		info.style.cssText = styles.info;
		info.textContent = text;
		domElement.appendChild(info);
		setTimeout(() => info.style.opacity = 0, 50);
		setTimeout(() => domElement.removeChild(info), this.infoFadeDuration);
	}
	showImage(imageUrl, instant) {
		const {slideDelay, currImg, nextImg} = this;
		currImg.style.backgroundImage = 'url('+imageUrl+')';
		setTimeout(() => {
			currImg.style.transitionDuration = nextImg.style.transitionDuration = instant?0:(0.1 * slideDelay)+'ms';
			currImg.style.opacity = '1';
			nextImg.style.opacity = '0';
			this.nextImg = currImg;
			this.currImg = nextImg;
		}, 50);
		clearTimeout(this.timeoutId);
		this.timeoutId = setTimeout(() => this.next(), slideDelay);
		this.showTime = Date.now();
	}
	next(instant) {
		const {imageUrls} = this;
		this.currIdx = (this.currIdx + 1) % imageUrls.length;
		this.showImage(imageUrls[this.currIdx], instant);
	}
	prev(instant) {
		const {imageUrls} = this;
		this.currIdx = (this.currIdx + imageUrls.length - 1) % imageUrls.length;
		this.showImage(imageUrls[this.currIdx], instant);
	}
	setSlideDelay(nextDelay) {
		const now = Date.now();
		const nextTime = (this.showTime + nextDelay) - now;
		console.info('Slide delay: %i -> %i (next in %i ms)', this.slideDelay, nextDelay, nextTime);
		clearTimeout(this.timeoutId);
		this.timeoutId = setTimeout(() => this.next(), nextTime);
		this.slideDelay = nextDelay;
		this.showInfo(`Delay ${Math.round(nextDelay)} ms`);
	}
	incSlideDelay() {
		this.setSlideDelay(this.slideDelay * this.delayChangeFactor);
	}
	decSlideDelay() {
		this.setSlideDelay(this.slideDelay * (1 / this.delayChangeFactor));
	}
	shuffle() {
		shuffleFisherYates(this.imageUrls);
		this.currIdx = -1;
		this.next(true);
		this.showInfo('[r]andomizing');
	}
	start(files) {
		const {domElement, url, currImg, nextImg, imageUrls} = this;
		emptyDomElem(currImg);
		emptyDomElem(nextImg);
		emptyDomElem(domElement);
		domElement.appendChild(currImg);
		domElement.appendChild(nextImg);
		currImg.style.cssText = styles.image;
		nextImg.style.cssText = styles.image;
		imageUrls.forEach(url.revokeObjectURL.bind(url));
		this.imageUrls = files.map(url.createObjectURL.bind(url));
		this.showInfo(`Showing ${this.imageUrls.length} images`);
		this.currIdx = -1;
		this.next();
	}
}

const handleWindowReady = (win) => {
	const {document, URL: url} = win.contentWindow;
	function main() {
		const {body} = document; 
		const slideshow = new Slideshow(body, url);
		const handleDrop = (event) => {
			cancelEvent(event);
			const files = [].slice.apply.call([].slice, event.dataTransfer.files);
			slideshow.start(files);
		};
		const handleMousedown = (event) => (event.clientX > 0.5 * event.view.innerWidth)?slideshow.prev(true):slideshow.next(true);
		const handleMousedwheel = (event) => (event.deltaY > 0)?slideshow.next(true):slideshow.prev(true);
		const handleKeydown = (event) => {
			switch (event.key) {
				case 'ArrowLeft': slideshow.prev(true); break;
				case 'ArrowRight': slideshow.next(true); break;
				case 'F11': win.isFullscreen()?win.restore():win.fullscreen(); break;
				case 'r': slideshow.shuffle(); break;
				case '+': slideshow.decSlideDelay(); break;
				case '-': slideshow.incSlideDelay(); break;
			}
		};
		document.addEventListener('dragenter', cancelEvent);
		document.addEventListener('dragover', cancelEvent);
		document.addEventListener('drop', handleDrop);
		document.addEventListener('mousedown', handleMousedown);
		document.addEventListener('mousewheel', handleMousedwheel);
		document.addEventListener('keydown', handleKeydown);
	}
	console.info('Slideshow version: %s', version);
	document.addEventListener('DOMContentLoaded', main);
};

const handleOnLaunched = () => {
	chrome.app.window.create('window.html', windowProps, handleWindowReady);
};

chrome.app.runtime.onLaunched.addListener(handleOnLaunched);
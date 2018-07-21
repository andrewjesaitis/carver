let i = 0;

self.onmessage = function(e) {
  i += 1;
  postMessage(i);
};

CC=emcc
SRC=carver.c
CFLAGS=-Wall -O2
EMSCRIPTEN_FLAGS=-s WASM=1 -s MODULARIZE=1 --post-js post.js
OUTPUT_NAME=carver_c
ODIR=../app/lib
OUTPUT=$(OUTPUT_NAME).js

all: $(SRC)
	$(CC) $(SRC) $(CFLAGS) $(EMSCRIPTEN_FLAGS) -o $(ODIR)/$(OUTPUT)

clean:
	rm -f $(ODIR)/$(OUTPUT)
	rm -f $(ODIR)/$(OUTPUT).mem
	rm -f $(ODIR)/$(OUTPUT).map
	rm -f $(ODIR)/$(OUTPUT_NAME).wasm
	rm -f $(ODIR)/$(OUTPUT_NAME).wasm.map
	rm -f $(ODIR)/$(OUTPUT_NAME).wast

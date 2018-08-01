CC=emcc
SRC=carver.cpp
CFLAGS=-Werror -std=c++11 -O3 -g0
EMSCRIPTEN_FLAGS=-s WASM=1 \
	-s EXPORTED_FUNCTIONS='["_grayscale"]'
OUTPUT_NAME=carver_c
ODIR=../app/scripts
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

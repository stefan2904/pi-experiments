#!/bin/bash

# location of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

touch "$SCRIPT_DIR/.env" # if user did not create it based on .env.template

# --install flag
if [[ "$1" == "--install" ]]; then
    ZSHRC="$HOME/.zshrc.local"
    if [ ! -f "$ZSHRC" ]; then
        echo "Error: zsh config not found at $ZSHRC"
        exit 1
    fi

    if grep -q "alias pi=" "$ZSHRC" || grep -q "alias pi =" "$ZSHRC"; then
        echo "Alias 'pi' already exists in $ZSHRC"
    else
        echo "Installing 'pi' alias in $ZSHRC..."
        if printf "\nalias pi='%s/pi.sh' # pi-coding-agent alias\n" "$SCRIPT_DIR" >> "$ZSHRC"; then
            echo "Successfully installed 'pi' alias. Please run 'source ~/.zshrc' or restart your terminal."
        else
            echo "Error: Failed to write to $ZSHRC."
            echo "Please manually add the following line to your $ZSHRC:"
            echo "alias pi='$SCRIPT_DIR/pi.sh'"
            exit 1
        fi
    fi
    exit 0
fi

# --update flag
if [[ "$1" == "--update" ]]; then
    cd "$SCRIPT_DIR"
    ./build.sh
    exit 0
fi


DEBUGFLAGS=""
#DEBUGFLAGS="--entrypoint zsh"
# test volumes: ./pi.sh -c 'touch ~/.pi/test'


echo "INFO: Using env file: $SCRIPT_DIR/.env"
if [ -n "$DEBUGFLAGS" ]; then
    echo "INFO: docker run flags: $DEBUGFLAGS"
fi

docker run --rm -it \
  -v "$PWD":/workspace:rw \
  -v "$SCRIPT_DIR/pi":/home/pi/.pi:rw \
  -w /workspace \
  --env-file "$SCRIPT_DIR/.env" $DEBUGFLAGS \
  pi-coding-agent "${@}"

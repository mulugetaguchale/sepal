FROM debian:buster
RUN apt-get update && apt-get install -y \
  curl \
  dnsutils \
  git \
  gnupg \
  htop \
  libssl-dev \
  libffi-dev \
  nano \
  packer \
  procps \
  python3 \
  python3-gdal \
  python3-pip \
  gdal-bin \
  screen \
  sudo \
  unzip \
  wget \
  zip
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.2.list  
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install -y mongodb-org yarn
RUN useradd sepal -m && usermod -aG sudo sepal && echo 'sepal     ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers
USER sepal
RUN curl -s "https://get.sdkman.io" | bash
RUN bash -c "source '/home/sepal/.sdkman/bin/sdkman-init.sh' && sdk install java 12.0.2.hs-adpt"
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
RUN bash -c "source /home/sepal/.nvm/nvm.sh && nvm install node 13"
ENV SEPAL_HOME=/usr/local/lib/sepal
RUN echo 'PATH="$HOME/.local/bin:$PATH"' >> /home/sepal/.bashrc
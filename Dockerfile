FROM docker:dind

# install basic tools
RUN apk add --update make g++ nodejs npm git python3 curl vim gcompat tini

# add code-oss package
COPY code-oss/vscode-reh-web-linux-x64 /code-oss
RUN cd /code-oss && npm i --legacy-peer-deps

# install fullstacked globally
RUN npm i -g fullstacked && \
    ln -s /usr/local/lib/node_modules/fullstacked/node_modules/@fullstacked/cli/cli.js /usr/local/bin/fsc && \
    ln -s /usr/local/lib/node_modules/fullstacked/node_modules/@fullstacked/cli/cli.js /usr/local/bin/fullstacked

# install git-credential-manager
RUN curl -L https://github.com/git-ecosystem/git-credential-manager/releases/download/v2.3.0/gcm-linux_amd64.2.3.0.tar.gz -o /tmp/gcm.tar.gz && \
    tar -xvf /tmp/gcm.tar.gz -C /usr/bin && \
    rm /tmp/gcm.tar.gz && \
    echo "export GCM_CREDENTIAL_STORE=plaintext" >> /etc/profile && \
    git-credential-manager configure

# make /home the user root folder
RUN sed -i 's/\/root:\/bin\/ash/\/home:\/bin\/ash/g' /etc/passwd
WORKDIR /home

# custom commands
COPY bin /fbin
RUN chmod +x -R /fbin && \
    mv /fbin/* /bin && \
    rm -rf /fbin

RUN rm -rf /home/dockremap && \
    npm config set prefix '/home/.npm/' && \
    echo "export PATH=\$PATH:/home/.npm/bin" >> /etc/profile && \
    echo "export DOCKER_HOST=\"\"" >> /etc/profile && \
    echo "export PS1='\w \$ '" >> /etc/profile && \
    mkdir -p /home/.npm/lib

CMD ["tini", "--", "/bin/sh", "-c", "/usr/local/bin/dockerd-entrypoint.sh & node /code-oss/out/server-main.js --without-connection-token --host 0.0.0.0 --port 8888 & fsc workspace"]

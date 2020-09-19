FROM gradle:6.6.1-jre14

ENV GRADLE_DIST_BIN_CHECKSUM "7873ed5287f47ca03549ab8dcb6dc877ac7f0e3d7b1eb12685161d10080910ac"
ENV GRADLE_DIST_ALL_CHECKSUM "11657af6356b7587bfb37287b5992e94a9686d5c8a0a1b60b87b9928a2decde5"
ENV GRADLE_WRAPPER_JAR_CHECKSUM "e996d452d2645e70c01c11143ca2d3742734a28da2bf61f25c82bdc288c9e637"

RUN mkdir /usr/local/node

COPY --from=node:lts-slim /usr/local/lib /usr/local/node/lib
COPY --from=node:lts-slim /usr/local/bin /usr/local/node/bin

ENV PATH="/usr/local/node/bin:${PATH}"

WORKDIR /action-update-gradle-wrapper

COPY package.json package-lock.json tsconfig.json ./
COPY src/ src/

RUN npm install && npm run docker

ENTRYPOINT ["node", "/action-update-gradle-wrapper/dist/index.js"]

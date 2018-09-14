class Blog {
    constructor(swarm) {
        this.last_photoalbum_id = 0;
        this.last_videoalbum_id = 0;
        this.prefix = "social/";
        this.mruName = "SWARM Social";
        this.swarm = swarm;
        this.version = 1;
        this.myProfile = {};
        let elements = window.location.href.split('/').filter(word => word.length === 64 || word.length === 128 || (word.length >= 11 && word.endsWith('.eth')));
        this.uploadedToSwarm = elements.length > 0;
        if (this.uploadedToSwarm) {
            this.uploadedSwarmHash = elements[0];
        } else {
            this.uploadedSwarmHash = '';
        }
    }

    deleteFile(file) {
        return this.swarm.delete(file);
    }

    replaceUrlSwarmHash(newHash) {
        if (this.uploadedToSwarm) {
            window.location.hash = '';
        }

        let newElements = [];
        window.location.href.split('/').forEach(function (v) {
            let item = v;
            if (Blog.isCorrectSwarmHash(v)) {
                item = newHash;
            }

            newElements.push(item);
        });
        let newUrl = newElements.join('/');
        window.history.pushState({"swarmHash": newHash}, "", newUrl);

        return newUrl;
    }

    static isCorrectSwarmHash(hash) {
        let hashLength = 64;
        let hashLengthEncrypted = 128;

        return hash && (hash.length === hashLength || hash.length === hashLengthEncrypted);
    }

    getMyProfile() {
        return this.getProfile(this.swarm.applicationHash);
    }

    setMyProfile(data) {
        this.myProfile = data;
    }

    saveProfile(data, userHash) {
        data.version = this.version;
        return this.swarm.post(this.prefix + "profile.json", JSON.stringify(data), 'application/json', userHash);
    }

    getProfile(userHash) {
        return this.swarm.get(this.prefix + 'profile.json', userHash);
    }

    getIFollow() {
        return this.myProfile.i_follow ? this.myProfile.i_follow.slice(0) : [];
    }

    addIFollow(swarmProfileHash) {
        if ('i_follow' in this.myProfile) {
            if (this.myProfile.i_follow.indexOf(swarmProfileHash) > -1) {
                throw "Hash already exists";
            }

            this.myProfile.i_follow.push(swarmProfileHash);
        } else {
            this.myProfile.i_follow = [swarmProfileHash];
        }

        return this.saveProfile(this.myProfile);
    }

    deleteIFollow(swarmProfileHash) {
        if ('i_follow' in this.myProfile) {
            if (this.myProfile.i_follow.indexOf(swarmProfileHash) > -1) {
                let index = this.myProfile.i_follow.indexOf(swarmProfileHash);
                if (index > -1) {
                    this.myProfile.i_follow.splice(index, 1);
                }
            }
        } else {
            this.myProfile.i_follow = [];
        }

        return this.saveProfile(this.myProfile);
    }

    sendRawFile(fileName, data, fileType, userHash, swarmProtocol, onProgress) {
        return this.swarm.post(fileName, data, fileType, userHash, swarmProtocol, onProgress);
    }

    uploadFileForPost(id, fileContent, contentType, fileName, onUploadProgress) {
        // structure
        // post/ID/file/[timestamp].[extension]
        let self = this;
        let url = null;
        if (fileName) {
            let extension = fileName.split('.').pop();
            let timestamp = +new Date();
            url = this.prefix + "post/" + id + "/file/" + timestamp + "." + extension;
        } else {
            url = this.prefix + "post/" + id + "/file/";
        }

        return this.sendRawFile(url, fileContent, contentType, null, null, onUploadProgress).then(function (response) {
                return {
                    response: response,
                    url: url,
                    fullUrl: self.swarm.getFullUrl(url, response.data)
                };
            }
        );
    }

    uploadAvatar(fileContent) {
        // structure
        // file/avatar/original.jpg
        let self = this;
        let url = this.prefix + "file/avatar/original.jpg";

        return this.sendRawFile(url, fileContent, 'image/jpeg')
            .then(function (response) {
                console.log('avatar uploaded');
                console.log(response.data);
                self.swarm.applicationHash = response.data;
                self.myProfile.photo = {
                    original: url
                };

                return self.saveProfile(self.myProfile);
            });
    }

    createPost(id, description, attachments) {
        let self = this;
        // structure
        // /post/ID/info.json - {"id":id, "description":"my super post", "attachments":[]}
        attachments = attachments || [];
        attachments.forEach(function (v, i) {
            v.id = i + 1;
        });
        let info = {
            id: id,
            description: description,
            attachments: attachments
        };

        return this.sendRawFile(this.prefix + "post/" + id + "/info.json", JSON.stringify(info), 'application/json')
            .then(function (response) {
                console.log('one');
                console.log(response.data);
                self.myProfile.last_post_id = id;
                self.swarm.applicationHash = response.data;

                return self.saveProfile(self.myProfile);
            });
    }

    getPost(id, userHash) {
        return this.swarm.get(this.prefix + 'post/' + id + '/info.json', userHash);
    }

    deletePost(id) {
        return this.deleteFile(this.prefix + 'post/' + id + '/');
    }

    deletePostAttachment(postId, attachmentId) {
        let self = this;
        return self.getPost(postId).then(function (response) {
            let data = response.data;
            let newAttachments = [];
            let toDelete = null;
            data.attachments.forEach(function (v) {
                if (v.id != attachmentId) {
                    newAttachments.push(v);
                } else {
                    toDelete = v;
                }
            });

            if (toDelete) {
                return self.editPost(postId, data.description, newAttachments)
                    .then(function (response) {
                        self.swarm.applicationHash = response.data;

                        return self.deleteFile(toDelete.url);
                    });
            } else {
                throw "Attachment not found";
            }
        });
    }

    editPost(id, description, attachments) {
        let self = this;
        attachments = attachments || [];
        return this.getPost(id).then(function (response) {
            let data = response.data;
            data.description = description;
            data.attachments = attachments;
            return self.swarm.post(self.prefix + "post/" + id + "/info.json", JSON.stringify(data), 'application/json');
        });
    }

    createVideoAlbum(id, name, description, videos) {
        let self = this;
        // album structure
        // /photoalbum/info.json - [{"id": id, "name": "Album name 1", "description": "Description 1", "cover_file": "file1.jpg"}, {"id": id, "name":"Album name 2", "description": "Description 2", "cover_file": "file2.jpg"}]
        // video structure
        // /photoalbum/ID/info.json - {"id": id, "name": "Album name 1", "description": "My super album", "cover": "/file/name.jpg", "videos":[{"preview":"file/name.jpg", "file": "123123.mp4", "type":"file|youtube", "description": "My description"}, {"file": "77777.jpg", "description": "My 777 description"}]}
        videos = videos || [];
        let coverFile = videos.length ? videos[0].cover_file : videos;
        let fileType = videos.length ? videos[0].type : videos;
        let info = {
            id: id,
            type: fileType,
            name: name,
            description: description,
            cover_file: coverFile,
            videos: videos
        };

        let finalSave = function (data) {
            return self.sendRawFile(self.prefix + "videoalbum/info.json", JSON.stringify(data), 'application/json')
                .then(function (response) {
                    console.log(response.data);
                    self.swarm.applicationHash = response.data;
                    self.myProfile.last_videoalbum_id = id;

                    return {response: self.saveProfile(self.myProfile), info: info};
                });
        };

        return this.sendRawFile(this.prefix + "videoalbum/" + id + "/info.json", JSON.stringify(info), 'application/json')
            .then(function (response) {
                console.log('Video album info.json');
                console.log(response.data);
                self.swarm.applicationHash = response.data;
                let newInfo = {
                    id: id,
                    type: fileType,
                    name: name,
                    description: description,
                    cover_file: coverFile
                };

                return self.getVideoAlbumsInfo()
                    .then(function (response) {
                        let data = response.data;
                        data = Array.isArray(data) ? data : [];

                        data.push(newInfo);
                        console.log('album info');
                        console.log(data);

                        return finalSave(data);
                    })
                    .catch(function () {
                        return finalSave([newInfo]);
                    });
            });
    }

    getVideoAlbumsInfo() {
        return this.swarm.get(this.prefix + 'videoalbum/info.json');
    }

    getVideoAlbumInfo(id) {
        return this.swarm.get(this.prefix + 'videoalbum/' + id + '/info.json');
    }

    uploadVideoToAlbum(photoAlbumId, photoId, fileContent, contentType, onProgress) {
        let fileName = this.prefix + "videoalbum/" + photoAlbumId + "/" + photoId + ".mp4";
        return this.sendRawFile(fileName, fileContent, contentType, null, null, onProgress).then(function (response) {
            return {fileName: fileName, response: response.data};
        });
    }

    createPhotoAlbum(id, name, description, photos) {
        let self = this;
        // structure
        // /photoalbum/info.json - [{"id": id, "name": "Album name 1", "description": "Description 1", "cover_file": "file1.jpg"}, {"id": id, "name":"Album name 2", "description": "Description 2", "cover_file": "file2.jpg"}]
        // /photoalbum/ID/info.json - {"id": id, "name": "Album name 1", "description": "My super album", "cover": "/file/name.jpg", "photos":[{"file": "123123.jpg", "description": "My description"}, {"file": "77777.jpg", "description": "My 777 description"}]}
        photos = photos || [];
        let coverFile = photos.length ? photos[0].file : photos;
        let info = {
            id: id,
            name: name,
            description: description,
            cover_file: coverFile,
            photos: photos
        };

        let navigateAndSaveProfile = function (response) {
            self.swarm.applicationHash = response.data;
            self.myProfile.last_photoalbum_id = id;

            return self.saveProfile(self.myProfile);
        };

        return this.sendRawFile(this.prefix + "photoalbum/" + id + "/info.json", JSON.stringify(info), 'application/json')
            .then(function (response) {
                console.log('Photoalbom info.json');
                console.log(response.data);
                self.swarm.applicationHash = response.data;
                let newAlbumInfo = {
                    id: id,
                    name: name,
                    description: description,
                    cover_file: coverFile
                };

                return self.getPhotoAlbumsInfo().then(function (response) {
                    let data = response.data;
                    data = Array.isArray(data) ? data : [];
                    data.push(newAlbumInfo);
                    console.log('album info');
                    console.log(data);
                    return self.saveAlbumsInfo(data).then(function (response) {
                        return navigateAndSaveProfile(response);
                    });
                }).catch(function () {
                    return self.saveAlbumsInfo([newAlbumInfo]).then(function (response) {
                        return navigateAndSaveProfile(response);
                    });
                });
            });
    }

    uploadPhotoToAlbum(photoAlbumId, photoId, fileContent, onProgress) {
        let fileName = this.prefix + "photoalbum/" + photoAlbumId + "/" + photoId + ".jpg";
        return this.sendRawFile(fileName, fileContent, 'image/jpeg', null, null, onProgress).then(function (response) {
            return {fileName: fileName, response: response.data};
        });
    }

    getAlbumInfo(id) {
        return this.swarm.get(this.prefix + 'photoalbum/' + id + '/info.json');
    }

    getPhotoAlbumsInfo() {
        return this.swarm.get(this.prefix + 'photoalbum/info.json');
    }

    saveAlbumsInfo(data) {
        return this.sendRawFile(this.prefix + "photoalbum/info.json", JSON.stringify(data), 'application/json');
    }

    deletePhotoAlbum(id) {
        let self = this;
        // todo delete all photos. Can we delete files from passed list?
        // todo delete from photoalbum/info.json
        return this.swarm.delete(this.prefix + 'photoalbum/' + id + '/1.jpg').then(function (response) {
            self.swarm.applicationHash = response.data;
            return self.getPhotoAlbumsInfo().then(function (response) {
                let data = response.data;
                let newAlbums = [];
                if (data && Array.isArray(data) && data.length) {
                    data.forEach(function (v) {
                        if (v.id != id) {
                            newAlbums.push(v);
                        }
                    });
                }

                return self.saveAlbumsInfo(newAlbums);
            });
        });
    }

    createMru(ownerAddress) {
        let self = this;
        // todo save it to profile
        if (!ownerAddress) {
            throw "Empty owner address";
        }

        let timestamp = +new Date();
        let data = {
            "name": this.mruName,
            "frequency": 5,
            "startTime": timestamp,
            "ownerAddr": ownerAddress
        };

        return this.swarm.post(null, data, null, null, 'bzz-resource:').then(function (response) {
            self.myProfile.mru = response.data;
            return {
                mru: response.data,
                response: self.saveProfile(self.myProfile)
            };
        });
    }

    saveMru(mru, rootAddress, swarmHash) {
        if (mru && rootAddress && swarmHash) {
        } else {
            throw "Empty MRU, rootAddress or SWARM hash";
        }

        let timestamp = +new Date();
        let data = {
            "name": this.mruName,
            "frequency": 5,
            "startTime": timestamp,
            "rootAddr": rootAddress,
            "data": "0x12a3",
            "multiHash": false,
            "version": 1,
            "period": 1,
            "signature": "0x71c54e53095466d019f9f46e34ae0b393d04a5dac7990ce65934a3944c1f39badfc8c4f3c78baaae8b2e86cd21940914c57a4dff5de45d47e35811f983991b7809"
        };

        return this.swarm.post(null, data, null, null, 'bzz-resource:');
    }

    saveMessage(receiverHash, message, isPrivate) {
        let self = this;
        if (isPrivate) {
            throw('Private messages not supported');
        }

        if (!Blog.isCorrectSwarmHash(receiverHash)) {
            throw('Incorrect receiver hash');
        }

        if (!message) {
            throw('Empty message');
        }


        let sendMessage = function (messageInfo) {
            let messageId = 1;
            if (receiverHash in messageInfo && 'last_message_id' in messageInfo[receiverHash]) {
                messageInfo[receiverHash].last_message_id++;
                messageId = messageInfo[receiverHash].last_message_id;
            } else {
                messageInfo = messageInfo || {};
                messageInfo[receiverHash] = {last_message_id: messageId};
            }

            let data = {
                id: messageId,
                receiverHash: receiverHash,
                message: message
            };

            return self.swarm.post(self.prefix + "message/public/" + receiverHash + "/" + messageId + ".json", JSON.stringify(data), 'application/json').then(function (response) {
                self.swarm.applicationHash = response.data;
                return self.saveMessageInfo(messageInfo);
            });
        };

        return self.getMessageInfo().then(function (response) {
            return sendMessage(response.data);
        }).catch(function () {
            return sendMessage({});
        });
    }

    getMessage(id, receiverHash) {
        return this.swarm.get(this.prefix + 'message/public/' + receiverHash + '/' + id + '.json');
    }

    getMessageInfo() {
        return this.swarm.get(this.prefix + 'message/public/info.json');
    }

    saveMessageInfo(data) {
        // {"*user hash*":{last_message_id:1}}
        return this.swarm.post(this.prefix + 'message/public/info.json', JSON.stringify(data));
    }
}

module.exports = Blog;
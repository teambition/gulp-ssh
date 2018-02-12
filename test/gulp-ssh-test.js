/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('chai-fs'))
chai.use(require('dirty-chai'))
const { expect } = chai
const fs = require('fs-extra')
const gulp = require('gulp')
const GulpSSH = require('..')
const os = require('os')
const path = require('path')
const { obj: map } = require('through2')

const DEST_DIR = path.join(__dirname, 'dest')
const FIXTURES_DIR = path.join(__dirname, 'fixtures')

describe('GulpSSH', () => {
  let gulpSSH
  const privateKeyFile = path.resolve(__dirname, 'etc/ssh/id_rsa')
  let sshConfig = {
    host: 'localhost',
    port: process.env.CI ? 2222 : 22,
    username: process.env.USER,
    privateKey: fs.readFileSync(privateKeyFile)
  }

  const collectFiles = (files, cb) => {
    if (cb) {
      return map((file, enc, next) => files.push(file) && next(), cb)
    } else {
      return map((file, enc, next) => files.push(file) && next(null, file))
    }
  }

  beforeEach(() => {
    gulpSSH = new GulpSSH({ ignoreErrors: false, sshConfig })
  })

  afterEach(() => {
    gulpSSH.close()
  })

  describe('instantiate', () => {
    it('should fail if options are not provided', () => {
      expect(() => new GulpSSH()).to.throw('sshConfig required')
    })

    it('should defer loading of private key specified in privateKeyFile option', () => {
      const localSshConfig = Object.assign({}, sshConfig, { privateKeyFile })
      delete localSshConfig.privateKey
      gulpSSH = new GulpSSH({ ignoreErrors: false, sshConfig: localSshConfig })
      expect(gulpSSH.options.sshConfig.privateKeyFile).to.equal(privateKeyFile)
      expect(gulpSSH.options.sshConfig).to.not.have.property('privateKey')
    })
  })

  describe('connect', () => {
    it('should connect if credentials provided by private key are good', (done) => {
      gulpSSH.on('error', done)
      gulpSSH.getClient().gulpReady(function () {
        expect(this.gulpConnected).to.equal(true)
        done()
      })
    })

    it('should connect if credentials provided by agent are good', function (done) {
      if (process.env.CI || process.env.SSH_AUTH_SOCK) {
        const localSshConfig = Object.assign({}, sshConfig, { agent: process.env.SSH_AUTH_SOCK })
        delete localSshConfig.privateKey
        gulpSSH = new GulpSSH({ ignoreErrors: false, sshConfig: localSshConfig })
        gulpSSH.on('error', done)
        gulpSSH.getClient().gulpReady(function () {
          expect(this.gulpConnected).to.equal(true)
          done()
        })
      } else {
        console.log('SSH agent not detected. Skipping SSH agent test.')
        this.skip()
        done()
      }
    })

    it('should connect if credentials provided by auto-detected agent are good', function (done) {
      if (process.env.CI || process.env.SSH_AUTH_SOCK) {
        const localSshConfig = Object.assign({}, sshConfig, { useAgent: true })
        delete localSshConfig.privateKey
        gulpSSH = new GulpSSH({ ignoreErrors: false, sshConfig: localSshConfig })
        gulpSSH.on('error', done)
        gulpSSH.getClient().gulpReady(function () {
          expect(this.gulpConnected).to.equal(true)
          done()
        })
      } else {
        console.log('SSH agent not detected. Skipping SSH agent test.')
        this.skip()
        done()
      }
    })

    it('should fail to connect if credentials are bad', (done) => {
      gulpSSH.options.sshConfig = Object.assign({}, sshConfig, { username: 'nobody' })
      gulpSSH.on('error', () => done())
      gulpSSH.getClient().gulpReady(() => {
        expect.fail()
        done()
      })
    })

    it('should load contents of private key on connect if privateKeyFile option is specified', (done) => {
      const localSshConfig = Object.assign({}, sshConfig, { privateKeyFile })
      delete localSshConfig.privateKey
      gulpSSH = new GulpSSH({ ignoreErrors: false, sshConfig: localSshConfig })
      gulpSSH.on('error', done)
      gulpSSH.getClient().gulpReady(function () {
        expect(this.gulpConnected).to.equal(true)
        expect(gulpSSH.options.sshConfig.privateKey).to.eql(sshConfig.privateKey)
        expect(gulpSSH.options.sshConfig).to.not.have.property('privateKeyFile')
        expect(localSshConfig.privateKeyFile).to.equal(privateKeyFile)
        expect(localSshConfig).to.not.have.property('privateKey')
        done()
      })
    })

    it('should expand leading tilde in privateKeyFile option', (done) => {
      const tildePrivateKeyFile = path.join('~', path.relative(os.homedir(), privateKeyFile))
      const localSshConfig = Object.assign({}, sshConfig, { privateKeyFile: tildePrivateKeyFile })
      delete localSshConfig.privateKey
      gulpSSH = new GulpSSH({ ignoreErrors: false, sshConfig: localSshConfig })
      gulpSSH.on('error', done)
      gulpSSH.getClient().gulpReady(function () {
        expect(this.gulpConnected).to.equal(true)
        expect(gulpSSH.options.sshConfig.privateKey).to.eql(sshConfig.privateKey)
        expect(gulpSSH.options.sshConfig).to.not.have.property('privateKeyFile')
        expect(localSshConfig.privateKeyFile).to.equal(tildePrivateKeyFile)
        expect(localSshConfig).to.not.have.property('privateKey')
        done()
      })
    })

    it('should use private key from privateKeyFile option instead of privateKey option', (done) => {
      const localSshConfig = Object.assign({}, sshConfig, { privateKeyFile, privateKey: 'bogus' })
      gulpSSH = new GulpSSH({ ignoreErrors: false, sshConfig: localSshConfig })
      gulpSSH.on('error', done)
      gulpSSH.getClient().gulpReady(function () {
        expect(this.gulpConnected).to.equal(true)
        expect(gulpSSH.options.sshConfig.privateKey).to.eql(sshConfig.privateKey)
        expect(gulpSSH.options.sshConfig).to.not.have.property('privateKeyFile')
        expect(localSshConfig.privateKeyFile).to.equal(privateKeyFile)
        expect(localSshConfig.privateKey).to.equal('bogus')
        done()
      })
    })
  })

  describe('exec', () => {
    it('should throw error if no commands are specified', () => {
      expect(() => gulpSSH.exec()).to.throw('`commands` required.')
    })

    it('should execute single command on server', (done) => {
      const files = []
      gulpSSH
        .exec('uptime')
        .pipe(collectFiles(files, () => {
          expect(files).to.have.lengthOf(1)
          expect(files[0].contents.toString()).to.include('load average')
          done()
        }))
    })

    it('should execute multiple commands on server', (done) => {
      const files = []
      gulpSSH
        .exec(['uptime', 'echo hello'])
        .pipe(collectFiles(files, () => {
          expect(files).to.have.lengthOf(1)
          const lines = files[0].contents.toString().split(/\r*\n/)
          expect(lines[0]).to.include('load average')
          expect(lines[1]).to.equal('hello')
          done()
        }))
    })
  })

  describe('dest', () => {
    const srcDir = FIXTURES_DIR

    afterEach(() => {
      fs.remove(DEST_DIR)
    })

    it('should copy files to server', (done) => {
      const files = []
      gulp
        .src('**/*', { cwd: srcDir, cwdbase: true })
        .pipe(collectFiles(files))
        .pipe(gulpSSH.dest(DEST_DIR))
        .on('finish', () => {
          expect(DEST_DIR).to.be.a.directory()
          files.forEach((file) => {
            if (file.isNull()) {
              expect(path.join(DEST_DIR, file.relative)).to.be.a.directory()
            } else {
              expect(path.join(DEST_DIR, file.relative)).to.be.a.file().with.contents(file.contents.toString())
            }
          })
          done()
        })
    })

    it('should create interim directories on server', (done) => {
      const nestedDestDir = path.join(DEST_DIR, 'a/b/c')
      const files = []
      gulp
        .src('**/*', { cwd: srcDir, cwdbase: true })
        .pipe(collectFiles(files))
        .pipe(gulpSSH.dest(nestedDestDir))
        .on('finish', () => {
          expect(DEST_DIR).to.be.a.directory()
          expect(nestedDestDir).to.be.a.directory()
          files.forEach((file) => {
            if (file.isNull()) {
              expect(path.join(nestedDestDir, file.relative)).to.be.a.directory()
            } else {
              expect(path.join(nestedDestDir, file.relative)).to.be.a.file().with.contents(file.contents.toString())
            }
          })
          done()
        })
    })
  })

  describe('sftp', () => {
    let clean

    afterEach(() => {
      if (clean) fs.remove(DEST_DIR)
    })

    it('should throw error if command is not specified', () => {
      expect(() => gulpSSH.sftp()).to.throw('`command` required.')
    })

    it('should throw error if command is unknown', () => {
      expect(() => gulpSSH.sftp('wat', '/path/to/file.txt')).to.throw('Command "wat" not supported.')
    })

    it('should read file over sftp', (done) => {
      const localSrcFile = path.join(FIXTURES_DIR, 'folder/file-in-folder.txt')
      const remoteSrcFile = path.relative(process.env.HOME, localSrcFile)
      const filePath = 'file-copy.txt'
      const files = []
      gulpSSH
        .sftp('read', remoteSrcFile, { filePath })
        .pipe(collectFiles(files, () => {
          expect(files).to.have.lengthOf(1)
          expect(files[0].relative).to.equal(filePath)
          expect(files[0].contents.toString()).to.equal(fs.readFileSync(localSrcFile, 'utf8'))
          done()
        }))
    })

    it('should write file over sftp', (done) => {
      clean = true
      const srcRelFile = 'folder/file-in-folder.txt'
      const srcAbsFile = path.join(FIXTURES_DIR, srcRelFile)
      const localDestFile = path.join(DEST_DIR, 'file-copy.txt')
      const remoteDestFile = path.relative(process.env.HOME, localDestFile)
      // NOTE sftp write requires dest directory to exist
      fs.ensureDirSync(DEST_DIR)
      gulp
        .src(srcRelFile, { cwd: FIXTURES_DIR, cwdbase: true })
        .pipe(gulpSSH.sftp('write', remoteDestFile))
        .on('finish', () => {
          expect(localDestFile).to.be.a.file().with.contents(fs.readFileSync(srcAbsFile, 'utf8'))
          done()
        })
    })
  })

  describe('shell', () => {
    const parseLog = (log) => {
      let currentCommand
      const output = { _preamble: [] }
      log.trim().split(/\r*\n/).forEach((line) => {
        const $idx = line.indexOf('$')
        if (~$idx) {
          currentCommand = line.substr($idx + 1).trim()
        } else if (currentCommand) {
          if (currentCommand in output) {
            output[currentCommand].push(line)
          } else {
            output[currentCommand] = [line]
          }
        } else {
          output._preamble.push(line)
        }
      })
      return output
    }

    it('should throw error if no commands are specified', () => {
      expect(() => gulpSSH.shell()).to.throw('`commands` required.')
    })

    it('should execute single command in shell on server', (done) => {
      const files = []
      gulpSSH
        .shell('pushd /tmp')
        .pipe(collectFiles(files, () => {
          expect(files).to.have.lengthOf(1)
          const output = parseLog(files[0].contents.toString())
          expect(output._preamble).to.include.members(['pushd /tmp', 'exit'])
          expect(Object.keys(output)).to.include.members(['pushd /tmp', 'exit'])
          done()
        }))
    })

    it('should execute multiple commands in shell on server', (done) => {
      const files = []
      gulpSSH
        .shell(['pushd /tmp', 'pwd'])
        .pipe(collectFiles(files, () => {
          expect(files).to.have.lengthOf(1)
          const output = parseLog(files[0].contents.toString())
          expect(output._preamble).to.include.members(['pushd /tmp', 'pwd', 'exit'])
          expect(Object.keys(output)).to.include.members(['pushd /tmp', 'pwd', 'exit'])
          expect(output.pwd).to.eql(['/tmp'])
          done()
        }))
    })

    it('should receive ssh data via ssh2Data event', (done) => {
      const ssh2Data = []
      gulpSSH
        .shell(['pushd /tmp', 'popd'])
        .on('ssh2Data', (chunk) => ssh2Data.push(chunk))
        .on('finish', () => {
          expect(ssh2Data).to.not.be.empty()
          expect(ssh2Data[0]).to.be.instanceOf(Buffer)
          const output = parseLog(ssh2Data.map((data) => data.toString()).join(''))
          expect(Object.keys(output)).to.include.members(['pushd /tmp', 'popd', 'exit'])
          done()
        })
    })
  })
})

/* eslint-env mocha */
'use strict'

const { expect } = require('chai')
const fs = require('fs')
const gulp = require('gulp')
const GulpSSH = require('..')
const path = require('path')
const { obj: map } = require('through2')

describe('GulpSSH', () => {
  let sshConfig = {
    host: 'localhost',
    port: process.env.CI ? 2222 : 22,
    // see username package to get username across platform
    username: process.env.USER,
    privateKey: fs.readFileSync(path.resolve(__dirname, 'etc/ssh/id_rsa'))
  }

  let gulpSSH

  beforeEach(() => {
    gulpSSH = new GulpSSH({ ignoreErrors: false, sshConfig })
  })

  afterEach(() => {
    gulpSSH.close()
  })

  describe('connect', () => {
    it('should fail to connect if credentials are bad', (done) => {
      gulpSSH.options.sshConfig = Object.assign({}, gulpSSH.options.sshConfig, { username: 'nobody' })
      gulpSSH.on('error', () => done())
      const client = gulpSSH.getClient()
      client.gulpReady(() => {
        expect.fail()
        done()
      })
    })

    it('should connect if credentials are good', (done) => {
      gulpSSH.on('error', done)
      const client = gulpSSH.getClient()
      client.gulpReady(() => {
        expect(client.gulpConnected).to.equal(true)
        done()
      })
    })
  })

  describe('exec', () => {
    it('should throw error if no commands are specified', () => {
      expect(() => gulpSSH.exec()).to.throw()
    })

    it('should execute command on server', (done) => {
      const files = []
      gulpSSH
        .exec('uptime')
        .pipe(map((file, enc, next) => {
          files.push(file)
          next()
        }, () => {
          expect(files).to.have.lengthOf(1)
          expect(files[0].contents.toString()).to.include('load average')
          done()
        }))
    })

    it('should execute multiple commands on server', (done) => {
      const files = []
      gulpSSH
        .exec(['uptime', 'echo hello'])
        .pipe(map((file, enc, next) => {
          files.push(file)
          next()
        }, () => {
          expect(files).to.have.lengthOf(1)
          const lines = files[0].contents.toString().split(/\n/)
          expect(lines[0]).to.include('load average')
          expect(lines[1]).to.equal('hello')
          done()
        }))
    })
  })
})

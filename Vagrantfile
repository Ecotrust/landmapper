# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

  module OS
    def OS.windows?
      (/cygwin|mswin|mingw|bccwin|wince|emx/ =~ RUBY_PLATFORM) != nil
    end
    def OS.mac?
      (/darwin/ =~ RUBY_PLATFORM) != nil
    end
    def OS.unix?
      !OS.windows?
    end
    def OS.linux?
      OS.unix? and not OS.mac?
    end
  end

  if OS.mac?

    puts "- Mac OS detected"
    puts "-- Assuming ARM64 (aka Apple Silicon) architecture"
    puts "-- Setting provider to QEMU"
    
    config.vm.box = "perk/ubuntu-2204-arm64"
    config.vm.network "forwarded_port", guest: 5432, host: 65432
    config.vm.network "forwarded_port", guest: 80, host: 8080 
    config.vm.network "forwarded_port", id: "ssh", guest: 22, host: 1234
    config.vm.network "forwarded_port", guest: 8000, host: 8000

    config.ssh.insert_key = true
    config.ssh.forward_agent = true

    config.vm.synced_folder "./", "/usr/local/apps/landmapper",
    type: "smb",
    # smb_host: "192.168.86.87"
    smb_host: "192.168.86.85"
    
    config.vm.provider "qemu" do |qe|
      qe.memory = "6020"
    end

  elsif OS.linux?

    puts "- Linux OS detected"
    puts "-- Assuming x86_64 architecture"
    puts "-- Setting provider to VirtualBox"

    config.vm.box = "ubuntu/jammy64"

    # config.disksize.size = '30GB'
    
    if Vagrant.has_plugin?("vagrant-vbguest")
      config.vbguest.auto_update = false
    end
    
    config.vm.network "forwarded_port", guest: 8000, host: 8000
    config.vm.network "forwarded_port", guest: 80, host: 8080
    config.vm.network "forwarded_port", guest: 5432, host: 65432

    config.vm.synced_folder "./", "/usr/local/apps/landmapper"

    config.vm.provider "virtualbox" do |vb|
      # vb.memory = "8192" # 8GB
      vb.memory = "4096" # 4GB
      # vb.memory = "3072"
    end

  elsif OS.windows?

    puts "Windows OS detected"
    puts "Please add configuration to VagrantFile"

  else
      
    puts "Unknown OS detected"
    puts "Please add configuration to VagrantFile"

  end
  
end

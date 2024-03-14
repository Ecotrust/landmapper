# -*- mode: ruby -*-
# vi: set ft=ruby :

# Function to dynamically get the host IP
# Used for setting the `smb_host` in config.vm.synced_folder
def get_host_ip
  # This example uses `ifconfig` and `grep` to find inet interface and host IP address
  host_ip = `ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'`.strip
  return host_ip
end

Vagrant.configure("2") do |config|

  # Define host machine operating system variables
  # source: https://stackoverflow.com/questions/26811089/vagrant-how-to-have-host-platform-specific-provisioning-steps/26889312#26889312
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
    puts "  -- Provider: QEMU"
    
    config.vm.box = "perk/ubuntu-2204-arm64"
    config.vm.network "forwarded_port", guest: 80, host: 8080 
    config.vm.network "forwarded_port", guest: 8000, host: 8000
    config.vm.network "forwarded_port", guest: 5432, host: 65432
    config.vm.network "forwarded_port", id: "ssh", guest: 22, host: 1243

    config.ssh.insert_key = true
    config.ssh.forward_agent = true

    # Automatically detect the SMB host IP
    smb_host_ip = get_host_ip
    
    config.vm.synced_folder "./", "/usr/local/apps/landmapper",
    type: "smb",
    smb_host: smb_host_ip

    config.vm.provider "qemu" do |qe|
      # qe.memory = "16384" # 16GB
      qe.memory = "6020" # 6GB
    end

  elsif OS.linux?

    puts "- Linux OS detected"
    puts "  -- Provider: VirtualBox"

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
